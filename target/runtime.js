export function isConstant(value) {
    return typeof value === "number";
}
export function isSymbol(value) {
    return typeof value === "string";
}
export function isAbstraction(value) {
    return typeof value === "object" && "body" in value;
}
export function isApplication(value) {
    return typeof value === "object" && "args" in value;
}
export function apply(name, ...args) {
    return { abstraction: name, args };
}
export function equivalent(x, y) {
    if (x === y) {
        return true;
    }
    if (isAbstraction(x) && isAbstraction(y)) {
        // TODO two abstractions should be equivalent even with renamed parameters
        return (equivalent(x.body, y.body) &&
            x.parameters.every((param, i) => equivalent(param, y.parameters[i])));
    }
    if (isApplication(x) && isApplication(y)) {
        return (equivalent(x.abstraction, y.abstraction) &&
            x.args.every((arg, i) => equivalent(arg, y.args[i])));
    }
    return false;
}
export function define(name, definition) {
    function inner(value) {
        if (value === name) {
            return definition;
        }
        // TODO abstraction
        if (isApplication(value)) {
            const args = value.args.map((arg) => inner(arg));
            const abstraction = inner(value.abstraction);
            return { args, abstraction };
        }
        return value;
    }
    return inner;
}
export function defineOperation(name, definition) {
    function inner(value, reductions) {
        // TODO abstraction
        if (isApplication(value)) {
            const abstraction = inner(value.abstraction, reductions);
            const args = value.args.map((arg) => inner(arg, reductions));
            if (abstraction === name) {
                return definition({ abstraction, args }, reductions);
            }
            return { args, abstraction };
        }
        return value;
    }
    return inner;
}
export const RootReductions = [
    define("pi", Math.PI),
    define("e", Math.PI),
    defineOperation("$let", (value, reductions) => {
        const [name, definition] = value.args;
        if (isSymbol(name)) {
            const previousReduction = firstReduction(name, reductions);
            if (previousReduction === undefined) {
                reductions.push(define(name, definition));
            }
            else {
                const index = reductions.indexOf(previousReduction);
                reductions[index] = define(name, definition);
            }
        }
        return value;
    }),
    defineOperation("$neg", (value) => {
        const [first] = value.args;
        if (isConstant(first)) {
            return -first;
        }
        if (isApplication(first) && first.abstraction === "$neg") {
            return first.args[0];
        }
        return value;
    }),
    defineOperation("$add", (value) => {
        const [left, right] = value.args;
        if (isConstant(left) && isConstant(right)) {
            return left + right;
        }
        if (left === 0) {
            return right;
        }
        if (right === 0) {
            return left;
        }
        return value;
    }),
    defineOperation("$sub", (value) => {
        const [left, right] = value.args;
        if (isConstant(left) && isConstant(right)) {
            return left - right;
        }
        if (left === 0) {
            return apply("$neg", right);
        }
        if (right === 0) {
            return left;
        }
        if (equivalent(left, right)) {
            return 0;
        }
        return value;
    }),
    defineOperation("$mul", (value) => {
        const [left, right] = value.args;
        if (isConstant(left) && isConstant(right)) {
            return left * right;
        }
        if (left === 0 || right === 0) {
            return 0;
        }
        if (left === 1) {
            return right;
        }
        if (right === 1) {
            return left;
        }
        if (left === -1) {
            return apply("$neg", right);
        }
        if (right === -1) {
            return apply("$neg", left);
        }
        return value;
    }),
    defineOperation("$div", (value) => {
        const [left, right] = value.args;
        if (isConstant(left) && isConstant(right)) {
            return left / right;
        }
        if (left === 0) {
            return 0;
        }
        if (right === 1) {
            return left;
        }
        if (right === -1) {
            return apply("$neg", left);
        }
        return value;
    }),
];
export function reduce(value, reductions = RootReductions) {
    const values = [value];
    outer: for (;;) {
        for (const reduction of reductions) {
            const reduced = reduction(value, reductions);
            if (!equivalent(value, reduced)) {
                value = reduced;
                values.push(value);
                continue outer;
            }
        }
        break;
    }
    return values;
}
export function firstReduction(value, reductions) {
    for (const reduction of reductions) {
        const reduced = reduction(value, reductions);
        if (!equivalent(value, reduced)) {
            return reduction;
        }
    }
}
