# notion-formula-2.0-converter

<img width="1201" alt="2023-09-11 at 22 04 35@2x" src="https://github.com/wustep/notion-formula-2.0-converter/assets/6259534/4e024827-315e-4d62-9ded-ce284af4789d">

## About
On September 7, 2023, Notion released Formulas 2.0, which included a new editor and new language syntax changes. With the new language syntax changes, all pre-existing formulas were migrated automatically to preserve the same outputs. 

However, you might still have formulas on older reference materials that aren't migrated. This tool can be used to best effort convert Notion formulas from 1.0 to 2.0. 

These converted formulas will likely be more verbose and less powerful than new formula 2.0s written using the new language and functions but are helpful for users using past formulas.

This is NOT necessarily the same algorithm as the Notion converter, so results may be slightly different. This isn't officially supported and is just a lil pet project!

## Usage
- Install: `npm install`
- Run dev: `npm run dev`
- Build: `npm run build`

## Important conversion notes

- We convert "add", "subtract", "multiply", "divide", "pow", "mod" to their operator equivalents to match the 2.0 converter, but technically this usage is actually valid in 2.0 anyways -- except in the case of using "add" for adding strings.
- Both this and the official converter convert ternaries `X ? Y : Z` to `if(X, Y, Z)`, even though ternaries are supported!
- In Notion, you can't actually save an errorneous formula. But this converter does no typechecking and very little error checking, so it doesn't know if your formula is invalid. It makes some guesses, but isn't comprehensive. Therefore, invalid formulas may lead to incorrect results. 
