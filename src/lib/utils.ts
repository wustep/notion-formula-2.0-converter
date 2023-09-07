export function compact<T>(arr: T[]): NonNullable<T>[] {
	return arr.filter(Boolean) as NonNullable<T>[]
}

export function unreachable(never: never): never {
	throw new Error(`Expected value to never occur: ${JSON.stringify(never)}`)
}
