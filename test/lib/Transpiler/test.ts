import * as tape from 'tape';
import {Transpiler} from "../../../src/lib/Transpiler";
import {
    TwingNode,
    TwingNodeComment, TwingNodeExpressionArray, TwingNodeExpressionAssignName, TwingNodeExpressionBinary,
    TwingNodeExpressionBinaryEqual,
    TwingNodeExpressionConstant, TwingNodeExpressionGetAttr,
    TwingNodeExpressionName, TwingNodeFor,
    TwingNodeIf, TwingNodePrint, TwingNodeText
} from "twing";

tape('Transpiler', (test) => {
    let transpiler = new Transpiler();

    test.test('supports TwingNodeComment', (test) => {
        let node = new TwingNodeComment('foo', 0, 0);

        test.same(transpiler.transpileNode(node), `<?php /*foo*/ ?>`);

        test.test('spanning multiple lines', (test) => {
            let node = new TwingNodeComment(`foo

bar`, 0, 0);

            test.same(transpiler.transpileNode(node), `<?php /*foo

bar*/ ?>`);

            node = new TwingNodeComment(`foo

bar
`, 0, 0);

            test.same(transpiler.transpileNode(node), `<?php /*foo

bar
*/ ?>`);

            test.end();
        });

        test.end();
    });

    test.test('supports TwingNodeExpressionConstant', (test) => {
        test.test('holding a string', (test) => {
            let node = new TwingNodeExpressionConstant('foo', 0, 0);

            test.same(transpiler.transpileNode(node), '"foo"');
            test.same(transpiler.transpileNode(node, true), 'foo');

            test.end();
        });

        test.test('holding a number', (test) => {
            test.same(transpiler.transpileNode(new TwingNodeExpressionConstant(5, 0, 0)), '5');
            test.same(transpiler.transpileNode(new TwingNodeExpressionConstant(5, 0, 0), true), '5');
            test.end();
        });

        test.test('holding a boolean', (test) => {
            test.same(transpiler.transpileNode(new TwingNodeExpressionConstant(true, 0, 0)), 'true');
            test.same(transpiler.transpileNode(new TwingNodeExpressionConstant(true, 0, 0), true), 'true');
            test.end();
        });

        test.end();
    });

    test.test('supports TwingNodeIf', (test) => {
        let node = new TwingNodeIf(
            new TwingNode(new Map([
                [0, new TwingNodeExpressionConstant('foo', 0, 0)],
                [1, new TwingNodeExpressionConstant('if body', 0, 0)],
                [2, new TwingNodeExpressionName('bar', 0, 0)],
                [3, new TwingNodeExpressionConstant('elseif body', 0, 0)]
            ])),
            new TwingNodeExpressionConstant('else body', 0, 0), 0, 0);

        test.same(transpiler.transpileNode(node), `<?php if ("foo"): ?>if body<?php elseif ($bar): ?>elseif body<php else: ?>else body<?php endif; ?>`);

        test.end();
    });

    test.test('supports TwingNodeExpressionName', (test) => {
        let node = new TwingNodeExpressionName('foo', 0, 0);

        test.same(transpiler.transpileNode(node), `$foo`);

        test.end();
    });

    test.test('supports TwingNodePrint', (test) => {
        test.same(transpiler.transpileNode(new TwingNodePrint(
            new TwingNodeExpressionConstant('foo', 0, 0), 0, 0)
        ), `<?="foo"?>`);
        test.same(transpiler.transpileNode(new TwingNodePrint(
            new TwingNodeExpressionConstant(5, 0, 0), 0, 0)
        ), `<?=5?>`);

        test.end();
    });

    test.test('supports TwingNodeText', (test) => {
        test.same(transpiler.transpileNode(new TwingNodeText(
            'foo', 0, 0)
        ), `foo`);
        test.end();
    });

    test.test('supports binary nodes', (test) => {
        test.same(transpiler.transpileNode(new TwingNodeExpressionBinaryEqual(
            [
                new TwingNodeExpressionConstant('foo', 0, 0),
                new TwingNodeExpressionConstant(5, 0, 0)
            ], 0, 0)
        ), `"foo"==5`);
        test.end();
    });

    test.test('supports TwingNodeExpressionGetAttr', (test) => {
        test.same(transpiler.transpileNode(new TwingNodeExpressionGetAttr(
            new TwingNodeExpressionName('foo', 0, 0),
            new TwingNodeExpressionConstant('bar', 0, 0),
            null,
            'any'
            , 0, 0)
        ), `$foo->bar`, 'with "any" type');

        test.same(transpiler.transpileNode(new TwingNodeExpressionGetAttr(
            new TwingNodeExpressionName('foo', 0, 0),
            new TwingNodeExpressionConstant('bar', 0, 0),
            null,
            'array'
            , 0, 0)
        ), `$foo["bar"]`, 'with "array" type');

        test.same(transpiler.transpileNode(new TwingNodeExpressionGetAttr(
            new TwingNodeExpressionName('foo', 0, 0),
            new TwingNodeExpressionConstant('bar', 0, 0),
            new TwingNodeExpressionArray(new Map(), 0, 0),
            'method'
            , 0, 0)
        ), `$foo->bar()`, 'with "method" type and zero argument');

        test.same(transpiler.transpileNode(new TwingNodeExpressionGetAttr(
            new TwingNodeExpressionName('foo', 0, 0),
            new TwingNodeExpressionConstant('bar', 0, 0),
            new TwingNodeExpressionArray(new Map([
                [0, new TwingNodeExpressionConstant(0, 0, 0)],
                [1, new TwingNodeExpressionConstant(1, 0, 0)]
            ]), 0, 0),
            'method'
            , 0, 0)
        ), `$foo->bar(1)`, 'with "method" type and one argument');

        test.same(transpiler.transpileNode(new TwingNodeExpressionGetAttr(
            new TwingNodeExpressionName('foo', 0, 0),
            new TwingNodeExpressionConstant('bar', 0, 0),
            new TwingNodeExpressionArray(new Map([
                [0, new TwingNodeExpressionConstant(0, 0, 0)],
                [1, new TwingNodeExpressionConstant(1, 0, 0)],
                [2, new TwingNodeExpressionConstant(1, 0, 0)],
                [3, new TwingNodeExpressionConstant('param2', 0, 0)]
            ]), 0, 0),
            'method'
            , 0, 0)
        ), `$foo->bar(1,"param2")`, 'with "method" type and two arguments');
        test.end();
    });

    test.test('supports TwingNodeExpressionArray nodes', (test) => {
        test.same(transpiler.transpileNode(new TwingNodeExpressionArray(new Map([
                [0, new TwingNodeExpressionConstant(0, 0, 0)],
                [1, new TwingNodeExpressionConstant(1, 0, 0)],
                [2, new TwingNodeExpressionConstant('key', 0, 0)],
                [3, new TwingNodeExpressionConstant('param2', 0, 0)]
            ]), 0, 0)
        ), `[0=>1,"key"=>"param2"]`);
        test.end();
    });

    test.test('supports TwingNodeFor nodes', (test) => {
        test.same(transpiler.transpileNode(new TwingNodeFor(
            new TwingNodeExpressionAssignName('key_target', 0, 0),
            new TwingNodeExpressionAssignName('value_target', 0, 0),
            new TwingNodeExpressionConstant('seq', 0, 0),
            new TwingNodeExpressionConstant('ifexpr', 0, 0),
            new TwingNodeText('body', 0, 0),
            new TwingNodeText('else', 0, 0),
            0, 0)
        ), `<?php foreach ("seq" as $key_target => $value_target): ?><?php if ("ifexpr"): ?>body<?php endif; ?><?php endforeach; ?>`);
        test.end();
    });

    test.test('transpile', (test) => {
        test.same(transpiler.transpile(`{{foo}}`), `<?=$foo?>`);

        test.end();
    });

    test.end();
});