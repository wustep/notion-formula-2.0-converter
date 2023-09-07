import React from "react"
import {
	ConversionResult,
	FORMULA_CHANGES_LIST,
	convertFormula,
} from "./lib/converter"
import { PROPERTY_TYPES, PropertyType } from "./lib/types"

import "./App.css"

function App() {
	const [input, setInput] = React.useState<string>("")

	const [propertyTypeMap, setPropertyTypeMap] = React.useState<{
		[key: string]: PropertyType
	}>({})

	const [conversionResult, setConversionResult] =
		React.useState<ConversionResult | null>(null)
	React.useEffect(() => {
		const newConversionResult = convertFormula(input, propertyTypeMap)
		setConversionResult(newConversionResult)
	}, [input, propertyTypeMap])

	// TODO: move these to css

	return (
		<div className="column">
			<div className="row">
				<div>
					<h3>Input</h3>
					<textarea value={input} onChange={e => setInput(e.target.value)} />
				</div>
				<span id="arrow">{"→"}</span>
				<div>
					<h3>Output</h3>
					<textarea value={conversionResult?.formula} />
				</div>
			</div>
			<br />
			{!!conversionResult?.propsReferenced?.size && (
				<div>
					<h3>Property types</h3>
					{Array.from(conversionResult.propsReferenced).map(propName => (
						<div key={propName}>
							<label htmlFor={propName}>{propName}</label>
							<select
								id={propName}
								value={propertyTypeMap[propName] || "other"}
								onChange={e => {
									setPropertyTypeMap({
										...propertyTypeMap,
										[propName]: e.target.value as PropertyType,
									})
								}}
							>
								{Object.values(PROPERTY_TYPES).map(propertyType => (
									<option key={propertyType} value={propertyType}>
										{propertyType}
									</option>
								))}
							</select>
						</div>
					))}
				</div>
			)}
			{!!conversionResult?.changes.length && (
				<div>
					<h3>Changes</h3>
					{conversionResult.changes.map((change, i) => {
						const description =
							FORMULA_CHANGES_LIST?.[change.changeIdentifier]?.description
						const exampleMaybeFn =
							FORMULA_CHANGES_LIST?.[change.changeIdentifier]?.example
						const example =
							typeof exampleMaybeFn === "function"
								? exampleMaybeFn(change.context ?? "")
								: exampleMaybeFn
						return (
							<ul key={i}>
								{description}
								<br />
								{"Example: " + example}
							</ul>
						)
					})}
				</div>
			)}
		</div>
	)
}

export default App
