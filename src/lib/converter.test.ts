import { convertFormula } from "./converter"

import { describe, it } from "@jest/globals"

describe("converter", () => {
	it("works for basic formula", () => {
		const convertResult = convertFormula("1 + 2", {})
		expect(convertResult).toEqual({
			formula: "1 + 2",
			changes: [],
			errors: [],
			propsReferenced: new Set(),
		})
	})

	it("gets the correct props referenced", () => {
		const convertResult = convertFormula('prop("A") + prop("B")', {})
		expect(convertResult).toEqual({
			formula: 'prop("A") + prop("B")',
			changes: [],
			errors: [],
			propsReferenced: new Set(["A", "B"]),
		})
	})
})
