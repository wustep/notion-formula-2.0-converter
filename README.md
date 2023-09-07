# notion-formula-2.0-converter

## About
On September 7, 2023, Notion released Formulas 2.0, which included a new editor and new language syntax changes. With the new language syntax changes, all pre-existing formulas were migrated automatically to preserve the same outputs.

However, you might still have formulas on older reference materials that aren't migrated. This tool can be used to best effort convert Notion formulas from 1.0 to 2.0.

This is NOT the same algorithm as the Notion converter, so results may be slightly different.

## Important conversion notes

- We convert "add", "subtract", "multiply", "divide", "pow", "mod" to their operator equivalents to match the 2.0 converter, but technically this usage is actually valid in 2.0 anyways -- except in the case of using "add" for adding strings.
- Both this and the official converter convert ternaries `X ? Y : Z` to `if(X, Y, Z)`, even though ternaries are supported!
- In Notion, you can't actually save an errorneous formula. But this converter does no typechecking whatsoever, it doesn't know if your formula is invalid. It makes some guesses, but isn't comprehensive. Therefore, invalid formulas may lead to incorrect results. 