export const PROPERTY_TYPES = [
	"person",
	"relation",
	"rollup",
	"id",
	"file",
	"multi-select",
	"other",
] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

export type PropertyMapping = {
	[propName: string]: PropertyType
}

export type FormulaFunctionNode = {
	type: "function"
	name: string
	args: FormulaNode[]
}

export type FormulaPropertyNode = {
	type: "property"
	name: string
	propertyType: PropertyType
}

export type FormulaLiteralNode = {
	type: "literal"
	value: string
}

export type FormulaParenthesesNode = {
	type: "parentheses"
	inner: FormulaNode
}

export type FormulaOperatorNode = {
	type: "operator"
	operator: string
	args: FormulaNode[]
}

export type FormulaConditionalNode = {
	type: "conditional"
	condition: FormulaNode
	ifTrue: FormulaNode
	ifFalse: FormulaNode
}

export type FormulaErrorNode = {
	type: "error"
	message: string
}

export type FormulaSymbolNode = {
	type: "symbol"
	name: string
}

export type FormulaNode =
	| FormulaFunctionNode
	| FormulaPropertyNode
	| FormulaLiteralNode
	| FormulaParenthesesNode
	| FormulaOperatorNode
	| FormulaConditionalNode
	| FormulaErrorNode
	| FormulaSymbolNode
