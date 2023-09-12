/**
 * Converter to convert Notion Formula 1.0s to 2.0.
 */

import { parseFormula } from "./parser"
import {
	FormulaConditionalNode,
	FormulaFunctionNode,
	FormulaNode,
	FormulaOperatorNode,
	FormulaPropertyNode,
	FormulaSymbolNode,
	PropertyMapping,
} from "./types"
import { unreachable } from "./utils"

/** Simple 1:1 renames from old functions to new functions */
const RENAMED_FORMULA_LIBRARY: {
	[oldFunction: FormulaChangeIdentifier]: string
} = {
	slice: "substring",
	start: "dateStart",
	end: "dateEnd",
}

/** 1:1 mappings of old functions to operators */
const BINARY_FUNCTION_TO_OPERATOR: {
	[oldFunction: FormulaChangeIdentifier]: string
} = {
	// add, subtract, multiply, divide, pow, mod all still exist in 2.0, so they're technically not necessary.
	// Except for add -- we convert add() to + because add() no longer supports text values.
	add: "+",
	subtract: "-",
	multiply: "*",
	divide: "/",
	pow: "^",
	mod: "%",
	equal: "==",
	unequal: "!=",
	larger: ">",
	largerEq: ">=",
	smaller: "<",
	smallerEq: "<=",
	concat: "+",
}

// Remaining mappings include: unaryMinus, unaryPlus, month, day, join, `+ X` (unary plus), and `not X` (!) which are done inline.

type FormulaChangeIdentifier = keyof typeof FORMULA_CHANGES_LIST

type FormulaChange = {
	changeIdentifier: FormulaChangeIdentifier
	context?: string
}

type FormulaErrorIdentifier = keyof typeof FORMULA_ERRORS_LIST

type FormulaError = {
	errorIdentifier: FormulaErrorIdentifier
	context?: string
}

export type ConversionResult = {
	formula: string
	changes: FormulaChange[]
	// Set of all the property names that were referenced in the formula
	propsReferenced: Set<string>
	errors: FormulaError[]
}

// TODO: stricter typing here because this isn't typesafe object access
export const FORMULA_CHANGES_LIST: {
	[changeIdentifier: string]: {
		description: string
		example: (context: string) => string
		replace?: (x: string) => string
	}
} = {
	// Renamed functions
	slice: {
		description:
			"slice() is now substring(). Note that slice() still exists, but it is now a list function.",
		example: () => `slice("abc", 1, 2) → substring("abc", 1, 2)`,
	},
	start: {
		description: "start() is now dateStart().",
		example: () => `start(prop("Date")) → dateStart(prop("Date"))`,
	},
	end: {
		description: "end() is now dateEnd().",
		example: () => `end(prop("Date")) → dateEnd(prop("Date"))`,
	},
	// Removed functions
	unaryMinus: {
		description: "unaryMinus() is removed.",
		example: () => `unaryMinus(1) → -1`,
	},
	unaryPlus: {
		description: "unaryPlus() is removed. Use 'toNumber' instaed.",
		example: () => `unaryPlus("1") → toNumber("1")`,
	},
	larger: {
		description: "larger() is removed. Use '>' instead.",
		example: () => `larger(1, 2) → 1 > 2`,
	},
	largerEq: {
		description: "largerEq() is removed. Use '>=' instead.",
		example: () => `largerEq(1, 2) → 1 >= 2`,
	},
	smaller: {
		description: "smaller() is removed. Use '<' instead.",
		example: () => `smaller(1, 2) → 1 < 2`,
	},
	smallerEq: {
		description: "smallerEq() is removed. Use '<=' instead.",
		example: () => `smallerEq(1, 2) → 1 <= 2`,
	},
	not: {
		description: "not() is removed. Use '!' instead.",
		example: () => `not(true) → !true`,
	},
	// Revised functions
	add: {
		description:
			"add() no longer supports text values. We convert them all usages of add to use '+' instead for safety.",
		example: () => `add(1, 2) → 1 + 2`,
	},
	month: {
		description:
			"month() is now 1-indexed instead of 0-indexed. We convert all existing usages of month to subtract 1.",
		example: () => `month(x) → month(x) - 1`,
	},
	day: {
		description:
			"day() is now 1-indexed instead of 0-indexed. We convert all usages of day to be mod 7.",
		example: () => `day(x) → day(x) % 7`,
	},
	join: {
		description:
			"join() is now a list function and doesn't work for regular string params. We convert all usages of join to use the new list format function.",
		example: () => `join(",","a","b","c") → join(["a","b","c"], ",")`,
	},
	// Operators that are converted, but not necessarily needed to be converted.
	subtract: {
		description:
			"subtract() is converted to `-`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `subtract(1, 2) → 1 - 2`,
	},
	multiply: {
		description:
			"multiply() is converted to `*`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `multiply(1, 2) → 1 * 2`,
	},
	divide: {
		description:
			"divide() is converted to `/`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `divide(1, 2) → 1 / 2`,
	},
	pow: {
		description:
			"pow() is converted to `^`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `pow(1, 2) → 1 ^ 2`,
	},
	mod: {
		description:
			"mod() is converted to `%`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `mod(1, 2) → 1 % 2`,
	},
	equal: {
		description:
			"equal() is converted to `==`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `equal(1, 2) → 1 == 2`,
	},
	unequal: {
		description:
			"unequal() is converted to `!=`. This isn't quite necessary as the function is available in 2.0.",
		example: () => `unequal(1, 2) → 1 != 2`,
	},
	concat: {
		description:
			"concat() is now only used for lists, so existing usages were converted to `+`.",
		example: () => `concat("a", "b") → "a" + "b"`,
	},
	"+": {
		description: "+ as a unary operator is now removed. Use toNumber instead.",
		example: () => `+"1" → toNumber("1")`,
	},
	// Properties
	person: {
		description:
			"In 1.0, Person properties returned comma-separated text values. In 2.0, they are a list of Person objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) =>
			`${context} → join(${context}, map(format(current)), ", ")`,
	},
	relation: {
		description:
			"In 1.0, Relation properties returned comma-separated text values. In 2.0, they are a list of Page objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) =>
			`${context} → join("${context}", map(format(current)), ", ")`,
	},
	file: {
		description:
			"In 1.0, File properties returned comma-separated text values. In 2.0, they are a list of text. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) => `${context} → join(${context}, ", ")`,
	},
	"multi-select": {
		description:
			"In 1.0, Multi-select properties returned comma-separated text values. In 2.0, they are a list of text. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) => `${context} → join(${context}, ", ")`,
	},
	rollup: {
		description: `In 1.0, Rollup properties that are "show values" or "show values" returned comma-separated text values (without a space). In 2.0, they are a list of objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.`,
		example: (context: string) =>
			`${context} → ${context}, map(format(current)), ",")`,
	},
	id: {
		description:
			'In 1.0, ID properties returned the ID number. In 2.0, they return a string with the prefix, e.g. "TASK-123". In the conversion, we re-map prop references to the ID number to preserve outputs.',
		example: (context: string) =>
			`${context} → ${context}.split('-').last().toNumber()`,
	},
	// Constants
	pi: {
		description: "pi is now referred to with parentheses, like pi().",
		example: () => `pi → pi()`,
	},
	e: {
		description: "e is now referred to with parentheses, like e().",
		example: () => `e → e()`,
	},
}

export const FORMULA_ERRORS_LIST: {
	[errorIdentifier: string]: {
		text: (context: string) => string
	}
} = {
	operatorNoArgs: {
		text: (context: string) => `Operator ${context} with no arguments`,
	},
	operatorIncorrectArgs: {
		text: (context: string) =>
			`Operator ${context} called with incorrect arguments`,
	},
	parserError: {
		text: (context: string) => `Parser error: ${context}`,
	},
}

export function convertFormula(
	oldFormula: string,
	propMap: PropertyMapping
): ConversionResult {
	if (!oldFormula) {
		return {
			formula: "",
			changes: [],
			errors: [],
			propsReferenced: new Set(),
		}
	}
	const parsed = parseFormula(oldFormula, propMap)
	return convertParsedFormula(parsed.formula, [], [], new Set())
}

function convertParsedFormula(
	parsed: FormulaNode | undefined,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	if (!parsed) {
		return { formula: "", changes, errors, propsReferenced }
	}
	const parsedType = parsed.type
	switch (parsedType) {
		case "literal":
			return { formula: parsed.value, changes, errors: [], propsReferenced }
		case "function":
			return convertParsedFunction(parsed, changes, errors, propsReferenced)
		case "property":
			return convertParsedProperty(parsed, changes, errors, propsReferenced)
		case "parentheses":
			return {
				formula: `(${
					convertParsedFormula(parsed.inner, changes, errors, propsReferenced)
						.formula
				})`,
				changes,
				errors,
				propsReferenced,
			}
		case "operator":
			return convertParsedOperator(parsed, changes, errors, propsReferenced)
		case "conditional":
			return convertParsedConditional(parsed, changes, errors, propsReferenced)
		case "symbol":
			return convertParsedSymbol(parsed, changes, errors, propsReferenced)
		case "error":
			return {
				formula: "",
				changes,
				errors: [
					...errors,
					{
						errorIdentifier: "parserError",
						context: parsed.message,
					},
				],
				propsReferenced,
			}
		default:
			unreachable(parsedType)
	}
}

function convertParsedFunction(
	parsed: FormulaFunctionNode,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	const { args, name } = parsed
	const changeIndex = changes.length
	const convertedArgs = args.map(
		arg => convertParsedFormula(arg, changes, errors, propsReferenced).formula,
		propsReferenced
	)
	const convertedArgsWithComma = convertedArgs.join(", ")
	let newFormula: string
	if (name in RENAMED_FORMULA_LIBRARY) {
		const newFunctionName =
			RENAMED_FORMULA_LIBRARY[name as keyof typeof RENAMED_FORMULA_LIBRARY]
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `${newFunctionName}(${convertedArgsWithComma})`
	} else if (name in BINARY_FUNCTION_TO_OPERATOR) {
		const operatorReplacement =
			BINARY_FUNCTION_TO_OPERATOR[
				name as keyof typeof BINARY_FUNCTION_TO_OPERATOR
			]
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		if (args.length !== 2) {
			errors.push({
				errorIdentifier: "operatorIncorrectArgs",
				context: name,
			})
		}
		newFormula = `${maybeWrapParentheses(
			parsed.args[0],
			convertedArgs[0]
		)} ${operatorReplacement} ${maybeWrapParentheses(
			parsed.args[1],
			convertedArgs[1]
		)}`
	} else if (name === "unaryMinus") {
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `-${maybeWrapParentheses(parsed.args[0], convertedArgs[0])}`
	} else if (name === "unaryPlus") {
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `toNumber(${convertedArgs[0]})`
	} else if (name === "day") {
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `day(${convertedArgs[0]}) % 7`
	} else if (name === "month") {
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `month(${convertedArgs[0]}) - 1`
	} else if (name === "join") {
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
		newFormula = `join([${convertedArgs.slice(1).join(", ")}], ${
			convertedArgs[0]
		})`
	} else {
		newFormula = `${name}(${convertedArgsWithComma})`
	}
	return {
		formula: newFormula,
		changes,
		errors,
		propsReferenced,
	}
}

function convertParsedProperty(
	parsed: FormulaPropertyNode,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	const propertyType = parsed.propertyType
	propsReferenced.add(parsed.name)
	const context = `prop("${parsed.name}")`
	switch (propertyType) {
		case "person":
		case "relation":
			changes.push({
				changeIdentifier: propertyType,
				context,
			})
			return {
				formula: `join(prop("${parsed.name}"), map(format(current)), ", ")`,
				changes,
				errors,
				propsReferenced,
			}
		case "rollup":
			changes.push({
				changeIdentifier: propertyType,
				context,
			})
			return {
				formula: `join(prop("${parsed.name}"), map(format(current)), ",")`,
				changes,
				errors,
				propsReferenced,
			}
		case "file":
		case "multi-select":
			changes.push({
				changeIdentifier: propertyType,
				context,
			})
			return {
				formula: `join(prop("${parsed.name}"), ", ")`,
				changes,
				errors,
				propsReferenced,
			}
		case "id":
			changes.push({
				changeIdentifier: propertyType,
				context,
			})
			return {
				formula: `prop("${parsed.name}").split('-').last().toNumber()`,
				changes,
				errors,
				propsReferenced,
			}
		case "other":
			return {
				formula: `prop("${parsed.name}")`,
				changes,
				errors,
				propsReferenced,
			}
		default:
			unreachable(propertyType)
	}
}

function maybeWrapParentheses(
	formulaNode: FormulaNode,
	convertedFormula: string
): string {
	if (
		formulaNode.type === "conditional" ||
		(formulaNode.type === "function" &&
			(Object.keys(BINARY_FUNCTION_TO_OPERATOR).includes(formulaNode.name) ||
				["unaryPlus", "unaryMinus"].includes(formulaNode.name))) ||
		(formulaNode.type === "operator" &&
			formulaNode.args !== undefined &&
			formulaNode.args.length >= 2)
	) {
		// If we're in this branch, we *may* need parentheses but let's just always
		// add them so we don't have to think about operator precedence/associativity.
		return "(" + convertedFormula + ")"
	}
	return convertedFormula
}

function convertParsedOperator(
	parsed: FormulaOperatorNode,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	const { args, operator } = parsed
	// TODO: const changeIndex = changes.length
	if (args.length > 1) {
		const convertedArgs = args.map(
			arg => convertParsedFormula(arg, changes, errors, propsReferenced).formula
		)
		return {
			formula: convertedArgs.join(` ${operator} `),
			changes,
			errors,
			propsReferenced,
		}
	} else if (args.length === 1) {
		const convertedArg = convertParsedFormula(
			args[0],
			changes,
			errors,
			propsReferenced
		).formula
		let newFormula
		if (operator === "not") {
			changes.push({
				changeIdentifier: "not",
			})
			newFormula = `!${maybeWrapParentheses(args[0], convertedArg[0])})`
		} else if (operator === "+") {
			changes.push({
				changeIdentifier: "unaryPlus",
			})
			newFormula = `toNumber(${convertedArg})`
		} else {
			newFormula = `${operator}${convertedArg}`
		}
		return {
			formula: newFormula,
			changes,
			errors,
			propsReferenced,
		}
	}
	return {
		formula: "",
		changes,
		errors: [
			...errors,
			{
				errorIdentifier: "operatorNoArgs",
				context: parsed.operator,
			},
		],
		propsReferenced,
	}
}

/**
 * Convert a conditional node to a formula 2.0 conversion result.
 *
 * Note that `X ? Y : Z` also counts as a conditional by the math.js parser.
 */
function convertParsedConditional(
	parsed: FormulaConditionalNode,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	const { condition, ifTrue, ifFalse } = parsed
	const convertedArgs = [condition, ifTrue, ifFalse].map(
		arg => convertParsedFormula(arg, changes, errors, propsReferenced).formula
	)
	return {
		formula: `if(${maybeWrapParentheses(
			parsed.condition,
			convertedArgs[0]
		)}, ${maybeWrapParentheses(
			parsed.ifTrue,
			convertedArgs[1]
		)}, ${maybeWrapParentheses(parsed.condition, convertedArgs[2])})`,
		changes,
		errors,
		propsReferenced,
	}
}

function convertParsedSymbol(
	parsed: FormulaSymbolNode,
	changes: FormulaChange[],
	errors: FormulaError[],
	propsReferenced: Set<string>
): ConversionResult {
	const { name } = parsed
	if (name === "pi" || name === "e") {
		changes.push({
			changeIdentifier: name,
		})
		return {
			formula: `${name}()`,
			changes,
			errors,
			propsReferenced,
		}
	}
	// Otherwise, it's probably `true` / `false`
	return {
		formula: name,
		changes,
		errors,
		propsReferenced,
	}
}
