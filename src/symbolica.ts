import { question } from "readline-sync";
import { createInterface } from "readline";
import { parse, tokenize } from "./parsing.js";
import {
	Value,
	isApplication,
	isConstant,
	isSymbol,
	reduce,
} from "./runtime.js";

function symbolica() {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	console.log("Welcome to the Symbolica repl!");
	readline.setPrompt("> ");
	readline.on("line", (input) => {
		try {
			const ast = read(input);
			const results = reduce(ast);
			for (const result of results) {
				console.log(print(result));
			}
			readline.prompt();
		} catch (error) {
			console.error(error);
		}
	});
	readline.prompt();
}

export function read(source: string): Value {
	const tokens = tokenize(source);
	const ast = parse(tokens);
	return ast;
}

const CustomPrinters: Record<string, (args: Value[]) => string> = {
	$let: ([left, right]) => `(${print(left)} = ${print(right)})`,
	$neg: ([first]) => `-${print(first)}`,
	$add: ([left, right]) => `(${print(left)} + ${print(right)})`,
	$sub: ([left, right]) => `(${print(left)} - ${print(right)})`,
	$mul: ([left, right]) => `(${print(left)} * ${print(right)})`,
	$div: ([left, right]) => `(${print(left)} / ${print(right)})`,
	$mod: ([left, right]) => `(${print(left)} % ${print(right)})`,
};

export function print(value: Value): string {
	if (isConstant(value) || isSymbol(value)) {
		return `${value}`;
	}
	// TODO abstraction
	if (isApplication(value)) {
		if (isSymbol(value.abstraction) && value.abstraction in CustomPrinters) {
			return CustomPrinters[value.abstraction](value.args);
		}
		return `${print(value.abstraction)}(${value.args.map(print).join(", ")})`;
	}
	throw new Error("Unsupported!");
}

if (import.meta.url.endsWith(process.argv[1])) {
	symbolica();
}
