import { Value } from "./runtime.js";

export enum TokenType {
	Constant,
	Symbol,
	Operator,
	Whitespace,
	Comment,
}

export interface Token {
	type: TokenType;
	position: number;
	image: string;
}

const TokenPatterns: [TokenType, RegExp][] = [
	[TokenType.Comment, /^--.*/],
	[TokenType.Whitespace, /^\s+/],
	[TokenType.Constant, /^(NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity))/],
	[TokenType.Operator, /^(->|=|\+|\-|\*|\/|\(|\)|\[|\]|\^|\%|,)/],
	[TokenType.Symbol, /^[$_\w][$\w\d]*/],
];

export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let remaining = source;
	let position = 0;
	outer: while (remaining.length > 0) {
		for (const [type, pattern] of TokenPatterns) {
			const result = pattern.exec(remaining);
			if (result) {
				const image = result[0];
				tokens.push({ type, image, position });
				position += image.length;
				remaining = source.substring(position);
				continue outer;
			}
		}
		throw new Error(`Unexpected input! Starting here: "${remaining}"`);
	}
	return tokens;
}

const OperatorSymbols: Record<string, Value> = {
	"=": "$let",
	"+": "$add",
	"-": "$sub",
	"*": "$mul",
	"/": "$div",
	"%": "$mod",
	"[": "$vec",
};

export function parse(tokens: Token[]): Value {
	tokens = tokens.filter(
		(token) =>
			token.type !== TokenType.Whitespace && token.type !== TokenType.Comment
	);

	let position = 0;

	function syntaxError(): Error {
		console.log({ tokens, position });
		return new Error(`Syntax Error!`);
	}

	function match(toMatch: Partial<Token>, at: number = position): boolean {
		const next = tokens[at];
		if (next === undefined) {
			return false;
		}
		if (toMatch.type !== undefined && toMatch.type !== next.type) {
			return false;
		}
		if (toMatch.image !== undefined && toMatch.image !== next.image) {
			return false;
		}
		return true;
	}

	function parseStatement(): Value {
		if (match({ image: "=" }, position + 1)) {
			const name = parseSymbol();
			const operator = tokens[position++].image;
			const expression = parseExpression();
			return {
				abstraction: OperatorSymbols[operator],
				args: [name, expression],
			};
		} else {
			return parseExpression();
		}
	}

	function parseExpression(): Value {
		let term = parseTerm();
		while (match({ image: "+" }) || match({ image: "-" })) {
			const operator = tokens[position++].image;
			const left = term;
			const right = parseTerm();
			term = {
				abstraction: OperatorSymbols[operator],
				args: [left, right],
			};
		}
		return term;
	}

	function parseTerm(): Value {
		let term = parseFactor();
		while (
			match({ image: "*" }) ||
			match({ image: "/" }) ||
			match({ image: "%" })
		) {
			const operator = tokens[position++].image;
			const left = term;
			const right = parseFactor();
			term = {
				abstraction: OperatorSymbols[operator],
				args: [left, right],
			};
		}
		return term;
	}

	function parseFactor(): Value {
		if (match({ image: "-" })) {
			const operator = tokens[position++].image;
			const first = parseFactor();
			return {
				abstraction: "$neg",
				args: [first],
			};
		}
		if (match({ image: "(" })) {
			position++;
			const expression = parseExpression();
			if (!match({ image: ")" })) {
				throw syntaxError();
			}
			position++;
			return expression;
		}
		if (match({ image: "[" })) {
			const operator = tokens[position++].image;
			const expressions = [parseExpression()];
			while (match({ image: "," })) {
				position++;
				expressions.push(parseExpression());
			}
			if (!match({ image: "]" })) {
				throw syntaxError();
			}
			position++;
			return {
				abstraction: OperatorSymbols[operator],
				args: expressions,
			};
		}
		if (match({ type: TokenType.Constant })) {
			const token = tokens[position++];
			return parseFloat(token.image);
		}
		if (match({ type: TokenType.Symbol })) {
			const symbol = parseSymbol();
			if (match({ image: "(" })) {
				position++;
				const expressions = [parseExpression()];
				while (match({ image: "," })) {
					position++;
					expressions.push(parseExpression());
				}
				if (!match({ image: ")" })) {
					throw syntaxError();
				}
				position++;
				return {
					abstraction: symbol,
					args: expressions,
				};
			}
			return symbol;
		}
		throw syntaxError();
	}

	function parseSymbol(): Value {
		if (!match({ type: TokenType.Symbol })) {
			throw syntaxError();
		}
		return tokens[position++].image;
	}

	const statement = parseStatement();
	if (position < tokens.length) {
		console.log(statement);
		throw syntaxError();
	}
	return statement;
}
