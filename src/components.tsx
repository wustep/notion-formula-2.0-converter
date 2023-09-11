import React from "react"
import classNames from "classnames"

export function Heading({ children }: { children: React.ReactNode }) {
	return <h3 className="title is-4">{children}</h3>
}

export function Button({
	onClick,
	children,
	className,
}: {
	onClick: () => void
	children: React.ReactNode
	className?: string
}) {
	return (
		<button className={classNames(`button`, className)} onClick={onClick}>
			{children}
		</button>
	)
}

export function TextArea({
	value,
	onChange,
	disabled,
	id,
}: {
	value?: string
	onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	disabled?: boolean
	id?: string
}) {
	return (
		<textarea
			className="textarea"
			id={id}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	)
}

export function Columns({ children }: { children: React.ReactNode }) {
	return <div className="columns">{children}</div>
}

export function Column({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return <div className={classNames("column", className)}>{children}</div>
}

export function Table({ children }: { children: React.ReactNode }) {
	return <table className="table">{children}</table>
}

export function TableRow({ values }: { values: React.ReactElement[] }) {
	return (
		<tr>
			{values.map((value, index) => (
				<td key={index}>{value}</td>
			))}
		</tr>
	)
}

export function Select({
	options,
	value,
	onChange,
}: {
	options: readonly string[]
	value: string
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
	return (
		<div className="control">
			<div className="select is-fullwidth">
				<select value={value} onChange={onChange}>
					{options.map(option => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</div>
		</div>
	)
}
