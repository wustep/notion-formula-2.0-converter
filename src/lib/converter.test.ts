import { convertFormula } from "./converter"

import { describe, it } from "@jest/globals"

describe("converter", () => {
	it("works for basic formula", () => {
		const convertResult = convertFormula("1 + 2", {})
		expectConvertResult({
			result: convertResult,
			expects: {
				formula: "1 + 2",
			},
		})
	})

	it("gets the correct props referenced", () => {
		const convertResult = convertFormula('prop("A") + prop("B")', {})
		expectConvertResult({
			result: convertResult,
			expects: {
				formula: 'prop("A") + prop("B")',
				propsReferenced: ["A", "B"],
			},
		})
	})

	it('preserves \\n, \\t, \\" characters', () => {
		const convertResult = convertFormula('"\\n\\t\\""', {})
		expectConvertResult({
			result: convertResult,
			expects: {
				formula: '"\\n\\t\\""',
			},
		})
	})
})

function expectConvertResult({
	result,
	expects,
}: {
	result: ReturnType<typeof convertFormula>
	expects: {
		formula: string
		changeIdentifiers?: string[]
		errorIdentifiers?: string[]
		propsReferenced?: string[]
	}
}) {
	expect(result.formula).toEqual(expects.formula)
	expect(
		Object.values(result.changes).flatMap(change => change.changeIdentifier)
	).toEqual(expects.changeIdentifiers ?? [])
	expect(
		Object.values(result.errors).flatMap(error => error.errorIdentifier)
	).toEqual(expects.errorIdentifiers ?? [])
	expect(result.propsReferenced).toEqual(
		new Set(expects.propsReferenced) ?? new Set()
	)
}
