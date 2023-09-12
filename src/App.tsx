import React from "react"
import {
	ConversionResult,
	FORMULA_CHANGES_LIST,
	FORMULA_ERRORS_LIST,
	convertFormula,
} from "./lib/converter"
import {
	PROPERTY_TYPES,
	PROPERTY_TYPES_STRING,
	PropertyType,
} from "./lib/types"

import "bulma/css/bulma.min.css"
import "./App.css"
import {
	Button,
	Column,
	Columns,
	Heading,
	Select,
	Table,
	TextArea,
} from "./components"

function App() {
	const [input, setInput] = React.useState<string>("")

	const [propertyTypeMap, setPropertyTypeMap] = React.useState<{
		[key: string]: PropertyType
	}>({})

	const [copyText, setCopyText] = React.useState<string>("Copy")

	const [conversionResult, setConversionResult] =
		React.useState<ConversionResult | null>(null)
	React.useEffect(() => {
		const newConversionResult = convertFormula(input, propertyTypeMap)
		setConversionResult(newConversionResult)
		setPropertyTypeMap(propertyTypeMap)
	}, [input, propertyTypeMap])

	return (
		<Column>
			<Columns>
				<Column>
					<Heading>Formula 1.0</Heading>
					<TextArea value={input} onChange={e => setInput(e.target.value)} />
				</Column>
				<Column className="arrow">{"→"}</Column>
				<Column>
					<Heading>
						Formula 2.0
						{!!conversionResult?.formula.length && (
							<Button
								className={"copy-button"}
								onClick={() => {
									navigator.clipboard.writeText(conversionResult?.formula)
									setCopyText("Copied!")
									setTimeout(() => {
										setCopyText("Copy")
									}, 1000)
								}}
							>
								{copyText}
							</Button>
						)}
					</Heading>
					<TextArea
						id="formula2"
						value={conversionResult?.formula}
						disabled={true}
					/>
				</Column>
			</Columns>
			{!!conversionResult?.propsReferenced?.size && (
				<div>
					<hr />
					<Heading>Property types</Heading>
					<p>{`Property types with changes: ${PROPERTY_TYPES_STRING}`}</p>
					<Table>
						<tbody>
							{Array.from(conversionResult.propsReferenced).map(propName => (
								<tr key={propName}>
									<td className="property-type-cell">{propName}</td>
									<td>
										<Select
											value={propertyTypeMap[propName] ?? "other"}
											onChange={e => {
												const newPropertyTypeMap = {
													...propertyTypeMap,
													[propName]: e.target.value as PropertyType,
												}
												setPropertyTypeMap(newPropertyTypeMap)
											}}
											options={PROPERTY_TYPES}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</Table>
				</div>
			)}
			{!!conversionResult?.changes.length && (
				<div className="content">
					<hr />
					<Heading>Changes</Heading>
					<ul>
						{conversionResult.changes.map((change, i) => {
							const description =
								FORMULA_CHANGES_LIST?.[change.changeIdentifier]?.description
							const example =
								FORMULA_CHANGES_LIST?.[change.changeIdentifier]?.example
							return (
								<li key={`${change.changeIdentifier}-${i}`}>
									{description}
									<br />
									{"Example: "}
									<code>{example?.(change.context ?? "")}</code>
									<br />
								</li>
							)
						})}
					</ul>
				</div>
			)}
		</Column>
	)
}

export default App
