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

export const RENAMED_FORMULA_LIBRARY = {
	slice: "substring",
	start: "dateStart",
	end: "dateEnd",
}

// export const REMOVED_FUNCTIONS = {
// 	unaryMinus: "-",
// 	unaryPlus: "+",
// 	larger: ">",
// 	largerEq: ">=",
// 	smaller: "<",
// 	smallerEq: "<=",
// }

// const BINARY_FUNCTION_TO_OPERATOR = [
// 	"add",
// 	"subtract",
// 	"multiply",
// 	"divide",
// 	"pow",
// 	"mod",
// 	"equal",
// 	"unequal",
// 	"larger",
// 	"largerEq",
// 	"smaller",
// 	"smallerEq",
// ]

type FormulaChangeIdentifier = keyof typeof FORMULA_CHANGES_LIST

type FormulaChange = {
	changeIdentifier: FormulaChangeIdentifier
	context?: string
}

export type ConversionResult = {
	formula: string
	changes: FormulaChange[]
	// List of all the property names that were referenced in the formula
	propsReferenced: Set<string>
	errors: string[]
}

// TODO: stricter typing here because this isn't typesafe object access
export const FORMULA_CHANGES_LIST: {
	[changeIdentifier: string]: {
		description: string
		example: string | ((context: string) => string)
		replace?: (x: string) => string
	}
} = {
	// Functions
	slice: {
		description:
			"slice() is now substring(). Note that slice() still exists, but it is now a list function.",
		example: `slice("abc", 1, 2) -> substring("abc", 1, 2)`,
	},
	start: {
		description: "start() is now dateStart().",
		example: `start(prop("Date")) -> dateStart(prop("Date"))`,
	},
	end: {
		description: "end() is now dateEnd().",
		example: `end(prop("Date")) -> dateEnd(prop("Date"))`,
	},
	add: {
		description:
			"add() no longer supports text values. We convert them all usages of add to use '+' instead for safety.",
		example: `add(1, 2) -> 1 + 2`,
	},
	// Properties
	person: {
		description:
			"In 1.0, Person properties returned comma-separated text values. In 2.0, they are a list of Person objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) =>
			`prop(${context}) -> join(${context}, map(format(current)), ", ")`,
	},
	relation: {
		description:
			"In 1.0, Relation properties returned comma-separated text values. In 2.0, they are a list of Page objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) =>
			`prop(${context}) -> join(${context}, map(format(current)), ", ")`,
	},
	file: {
		description:
			"In 1.0, File properties returned comma-separated text values. In 2.0, they are a list of text. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) => `prop(${context}) -> join(${context}, ", ")`,
	},
	"multi-select": {
		description:
			"In 1.0, Multi-select properties returned comma-separated text values. In 2.0, they are a list of text. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) => `prop(${context}) -> join(${context}, ", ")`,
	},
	rollup: {
		description:
			"In 1.0, Rollup properties that are 'show values' or 'show values' returned comma-separated text values (without a space). In 2.0, they are a list of objects. In the conversion, we re-map old prop references to the comma-separated text value to preserve outputs.",
		example: (context: string) =>
			`prop(${context}) -> join(${context}, map(format(current)), ",")`,
	},
	id: {
		description:
			'In 1.0, ID properties returned the ID number. In 2.0, they return a string with the prefix, e.g. "TASK-123". In the conversion, we re-map prop references to the ID number to preserve outputs.',
		example: (context: string) =>
			`prop(${context}) -> prop(${context}).split('-').last().toNumber()`,
	},
	// Constants
	pi: {
		description: "pi is now referred to with parentheses, like pi().",
		example: `pi -> pi()`,
	},
	e: {
		description: "e is now referred to with parentheses, like e().",
		example: `e -> e()`,
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
	errors: string[],
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
				errors: [...errors, parsed.message],
				propsReferenced,
			}
		default:
			unreachable(parsedType)
	}
}

function convertParsedFunction(
	parsed: FormulaFunctionNode,
	changes: FormulaChange[],
	errors: string[],
	propsReferenced: Set<string>
): ConversionResult {
	const { args, name } = parsed
	const changeIndex = changes.length
	const convertedArgs = args
		.map(
			arg =>
				convertParsedFormula(arg, changes, errors, propsReferenced).formula,
			propsReferenced
		)
		.join(", ")
	let newFunctionName = name
	if (name in RENAMED_FORMULA_LIBRARY) {
		newFunctionName =
			RENAMED_FORMULA_LIBRARY[name as keyof typeof RENAMED_FORMULA_LIBRARY]
		changes.splice(changeIndex, 0, {
			changeIdentifier: name,
		})
	}
	return {
		formula: `${newFunctionName}(${convertedArgs})`,
		changes,
		errors,
		propsReferenced,
	}
}

function convertParsedProperty(
	parsed: FormulaPropertyNode,
	changes: FormulaChange[],
	errors: string[],
	propsReferenced: Set<string>
): ConversionResult {
	const propertyType = parsed.propertyType
	propsReferenced.add(parsed.name)
	switch (propertyType) {
		case "person":
		case "relation":
			changes.push({
				changeIdentifier: propertyType,
				context: parsed.name,
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
				context: parsed.name,
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
				context: parsed.name,
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
				context: parsed.name,
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

// TODO: use this
// function maybeWrapParentheses(
// 	formulaNode: FormulaNode,
// 	convertedFormula: string
// ): string {
// 	if (
// 		formulaNode.type === "conditional" ||
// 		(formulaNode.type === "function" &&
// 			(BINARY_FUNCTION_TO_OPERATOR.includes(formulaNode.name) ||
// 				["unaryPlus", "unaryMinus"].includes(formulaNode.name))) ||
// 		(formulaNode.type === "operator" &&
// 			formulaNode.args !== undefined &&
// 			formulaNode.args.length >= 2)
// 	) {
// 		// If we're in this branch, we *may* need parentheses but let's just always
// 		// add them so we don't have to think about operator precedence/associativity.
// 		return "(" + convertedFormula + ")"
// 	}
// 	return convertedFormula
// }

function convertParsedOperator(
	parsed: FormulaOperatorNode,
	changes: FormulaChange[],
	errors: string[],
	propsReferenced: Set<string>
): ConversionResult {
	const { args, operator } = parsed
	// TODO: const changeIndex = changes.length
	if (args.length > 1) {
		// TODO: Add binary operator changes?
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
		// TODO: add unary operator changes?
		const convertedArg = convertParsedFormula(
			args[0],
			changes,
			errors,
			propsReferenced
		).formula
		return {
			formula: `${operator}${convertedArg}`,
			changes,
			errors,
			propsReferenced,
		}
	}
	return {
		formula: "",
		changes,
		errors: [...errors, "Operator with no arguments"],
		propsReferenced,
	}
}

function convertParsedConditional(
	parsed: FormulaConditionalNode,
	changes: FormulaChange[],
	errors: string[],
	propsReferenced: Set<string>
): ConversionResult {
	const { condition, ifTrue, ifFalse } = parsed
	const changeIndex = changes.length
	const convertedArgs = [condition, ifTrue, ifFalse].map(
		arg => convertParsedFormula(arg, changes, errors, propsReferenced).formula
	)
	// TODO: Only add changes if it actually changed lol, maybe keep track of ?: vs if?
	// TBH, don't really need to report error here.
	changes.splice(changeIndex, 0, {
		changeIdentifier: "conditional",
	})
	return {
		formula: `if(${convertedArgs[0]}, ${convertedArgs[1]}, ${convertedArgs[2]})`,
		changes,
		errors,
		propsReferenced,
	}
}

function convertParsedSymbol(
	parsed: FormulaSymbolNode,
	changes: FormulaChange[],
	errors: string[],
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
