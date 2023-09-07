import * as math from "mathjs"
import { FormulaNode, PropertyMapping } from "./types"
import { compact } from "./utils"

type FormulaParserResult = {
	formula: FormulaNode | undefined
	errors: string[]
}

export function parseFormula(
	oldFormula: string,
	propMap: PropertyMapping
): FormulaParserResult {
	try {
		const mathNode = math.parse(oldFormula)
		const formulaNode = nodeToFormula(mathNode, propMap, [])
		return formulaNode
			? {
					formula: formulaNode,
					errors: [],
			  }
			: {
					formula: undefined,
					errors: ["Could not parse formula 😭"],
			  }
	} catch (e) {
		return {
			formula: undefined,
			errors: ["Could not parse formula 😭"],
		}
	}
}

function nodeToFormula(
	node: math.MathNode | undefined,
	propMap: PropertyMapping,
	errors: string[]
): FormulaNode | undefined {
	if (!node) {
		return
	}
	if (
		node.type === "AccessorNode" ||
		node.type === "ArrayNode" ||
		node.type === "AssignmentNode" ||
		node.type === "BlockNode" ||
		node.type === "FunctionAssignmentNode" ||
		node.type === "IndexNode" ||
		node.type === "ObjectNode" ||
		node.type === "RangeNode"
	) {
		const error = {
			type: "error" as const,
			message: "Invalid syntax: " + node.toString(),
		}
		errors.push(error.message)
		return error
	} else if (node.type === "ConditionalNode") {
		const condition = nodeToFormula(node.condition, propMap, errors)
		const trueExpr = nodeToFormula(node.trueExpr, propMap, errors)
		const falseExpr = nodeToFormula(node.falseExpr, propMap, errors)
		if (!condition) {
			return
		}
		if (condition.type === "error") {
			return condition
		}
		if (trueExpr && trueExpr.type === "error") {
			return trueExpr
		}
		if (falseExpr && falseExpr.type === "error") {
			return falseExpr
		}
		if (!trueExpr || !falseExpr) {
			const error = {
				type: "error" as const,
				message: "Invalid conditional: " + node.toString(),
			}
			errors.push(error.message)
			return error
		}
		return {
			type: "conditional",
			condition,
			ifTrue: trueExpr,
			ifFalse: falseExpr,
		}
	} else if (node.type === "ConstantNode") {
		return {
			type: "literal",
			value: typeof node.value === "string" ? `"${node.value}"` : node.value,
		}
	} else if (node.type === "FunctionNode") {
		const { fn, args } = node
		if (fn.name === "prop") {
			if (args.length !== 1) {
				return {
					type: "error",
					message: "Too many arguments passed to prop().",
				}
			}
			const arg = args[0]
			if (arg.type !== "ConstantNode") {
				const error = {
					type: "error" as const,
					message: "Invalid property reference: " + arg.toString(),
				}
				errors.push(error.message)
				return error
			}
			return {
				type: "property",
				name: arg.value,
				propertyType: propMap[arg.value] ?? "other",
			}
		}
		const functionArgs: FormulaNode[] = compact(
			(args || []).map(arg => nodeToFormula(arg, propMap, errors))
		)
		// Note: Does not check for invalid functions.
		return {
			type: "function",
			name: fn.name,
			args: functionArgs,
		}
	} else if (node.type === "OperatorNode") {
		const { op, args } = node

		const functionArgs: FormulaNode[] = compact(
			(args || []).map(arg => nodeToFormula(arg, propMap, errors))
		)
		// Note: Does not check for invalid operators.
		return {
			type: "operator",
			operator: op,
			args: functionArgs,
		}
	} else if (node.type === "ParenthesisNode") {
		return nodeToFormula(node.content, propMap, errors)
	} else if (node.type === "SymbolNode") {
		const { name } = node
		if (["e", "pi", "true", "false"].includes(name)) {
			return {
				type: "symbol",
				name,
			}
		} else {
			const error = {
				type: "error" as const,
				message: "Undefined constant:" + name,
			}
			errors.push(error.message)
			return error
		}
	}
	return
}
