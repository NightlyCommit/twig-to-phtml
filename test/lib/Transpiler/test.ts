import * as tape from 'tape';
import {Transpiler} from "../../../src/lib/Transpiler";

tape('Transpiler', (test) => {
    let transpiler = new Transpiler();

    test.test('transpile', (test) => {
        test.test('supports variable print', (test) => {
            test.same(transpiler.transpile('{{ foo }}'), '<?=$foo?>');

            test.end();
        });

        test.test('supports variable attributes', (test) => {
            test.same(transpiler.transpile('{{ foo.bar }}'), '<?=$foo->bar?>');
            test.same(transpiler.transpile('{{ foo["bar"] }}'), '<?=$foo["bar"]?>');
            test.same(transpiler.transpile('{{ foo.bar() }}'), '<?=$foo->bar()?>');
            test.same(transpiler.transpile('{{ foo.bar(1, 2) }}'), '<?=$foo->bar(1,2)?>');

            test.end();
        });

        test.test('supports comments', (test) => {
            test.same(transpiler.transpile(`{#foo#}`), `<?php /*foo*/ ?>`);
            test.same(transpiler.transpile(`{#
foo
#}`), `<?php /*foo*/ ?>`);
            test.same(transpiler.transpile(`{#
foo
bar
#}`), `<?php /*foo
bar*/ ?>`);

            test.end();
        });

        test.test('supports if', (test) => {
            test.same(transpiler.transpile(`{% if (foo == 5) %}
    TRUE
{% endif %}`), `<?php if (($foo)==(5)): ?>    TRUE
<?php endif; ?>`, 'if only');

            test.same(transpiler.transpile(`{% if (foo == 5) %}
    TRUE
{% else %}
    FALSE
{% endif %}`), `<?php if (($foo)==(5)): ?>    TRUE
<?php else: ?>    FALSE
<?php endif; ?>`, 'if and else');

            test.same(transpiler.transpile(`{% if (foo == 5) %}
    TRUE
{% elseif (foo == 4) %}
    FALSE
{% endif %}`), `<?php if (($foo)==(5)): ?>    TRUE
<?php elseif (($foo)==(4)): ?>    FALSE
<?php endif; ?>`, 'if and elseif');

            test.end();
        });

        test.test('support for', (test) => {
            test.same(transpiler.transpile(`{% for value in values %}
{{ value }}
{% endfor %}`), `<?php foreach ($values as $_key => $value): ?><?=$value?>
<?php endforeach; ?>`, 'with value only');

            test.same(transpiler.transpile(`{% for key, value in values %}
{{ value }}
{% endfor %}`), `<?php foreach ($values as $key => $value): ?><?=$value?>
<?php endforeach; ?>`, 'with key and value');

            test.end();
        });

        test.test('support array', (test) => {
            test.same(transpiler.transpile(`{{ [1, 2, 3] }}`), `<?=[0=>1,1=>2,2=>3]?>`);

            test.end();
        });

        test.test('support hash', (test) => {
            test.same(transpiler.transpile(`{{ {a: 1, b:2, c:3} }}`), `<?=["a"=>1,"b"=>2,"c"=>3]?>`);

            test.end();
        });

        test.test('supports set', (test) => {
            test.same(transpiler.transpile('{% set foo = "bar" %}'), '<?php $foo = "bar" ?>');
            test.same(transpiler.transpile('{% set foo, bar = "foo", "bar" %}'), `<?php $foo = "foo" ?>
<?php $bar = "bar" ?>`);
            test.same(transpiler.transpile('{% set foo = lorem.ipsum %}'), '<?php $foo = $lorem->ipsum ?>');
            test.same(transpiler.transpile('{% set foo = lorem.ipsum() %}'), '<?php $foo = $lorem->ipsum() ?>');
            test.same(transpiler.transpile('{% set foo %}Foo{% endset %}'), '<?php $foo = "Foo" ?>');
            test.same(transpiler.transpile('{% set foo %}Foo {{ bar }}{% endset %}'), '<?php ob_start(); ?>Foo <?=$bar?><?php $foo = ob_get_clean() ?>');

            test.end();
        });

        test.test('supports conditional expression', (test) => {
            test.same(transpiler.transpile('{{ foo ? "foo" : "bar" }}'), '<?=$foo ? "foo" : "bar"?>');

            test.end();
        });

        test.test('supports unary and binary expressions', (test) => {
            test.same(transpiler.transpile('{{ 1 + 2 }}'), '<?=(1)+(2)?>');
            test.same(transpiler.transpile('{{ 1 and 2 }}'), '<?=(1)&&(2)?>');
            test.same(transpiler.transpile('{{ 1 b-and 2 }}'), '<?=(1)&(2)?>');
            test.same(transpiler.transpile('{{ 1 b-or 2 }}'), '<?=(1)|(2)?>');
            test.same(transpiler.transpile('{{ 1 b-xor 2 }}'), '<?=(1)^(2)?>');
            test.same(transpiler.transpile('{{ 1 ~ 2 }}'), '<?=(1).(2)?>');
            test.same(transpiler.transpile('{{ 1 / 2 }}'), '<?=(1)/(2)?>');
            test.same(transpiler.transpile('{{ 1 == 2 }}'), '<?=(1)==(2)?>');
            test.same(transpiler.transpile('{{ 1 // 2 }}'), '<?=floor((1)/(2))?>');
            test.same(transpiler.transpile('{{ 1 > 2 }}'), '<?=(1)>(2)?>');
            test.same(transpiler.transpile('{{ 1 >= 2 }}'), '<?=(1)>=(2)?>');
            test.same(transpiler.transpile('{{ 1 < 2 }}'), '<?=(1)<(2)?>');
            test.same(transpiler.transpile('{{ 1 <= 2 }}'), '<?=(1)<=(2)?>');
            test.same(transpiler.transpile('{{ 1 % 2 }}'), '<?=(1)%(2)?>');
            test.same(transpiler.transpile('{{ 1 * 2 }}'), '<?=(1)*(2)?>');
            test.same(transpiler.transpile('{{ 1 != 2 }}'), '<?=(1)!=(2)?>');
            test.same(transpiler.transpile('{{ 1 or 2 }}'), '<?=(1)||(2)?>');
            test.same(transpiler.transpile('{{ 1 ** 2 }}'), '<?=(1)**(2)?>');
            test.same(transpiler.transpile('{{ 1 - 2 }}'), '<?=(1)-(2)?>');
            test.same(transpiler.transpile('{{ -1 }}'), '<?=-(1)?>');
            test.same(transpiler.transpile('{{ not 1 }}'), '<?=!(1)?>');
            test.same(transpiler.transpile('{{ +1 }}'), '<?=+(1)?>');

            test.end();
        });

        test.test('supports macro', (test) => {
            test.same(transpiler.transpile(`{% macro foo() %}
Foo {{ bar }}
{% endmacro %}
{{ _self.foo() }}
`), `<?php $foo = function() use (&$foo) { ?>
Foo <?=$bar?>
<?php } ?>
<?=$foo()?>
`);

            test.same(transpiler.transpile(`{% macro foo(arg) %}
Foo {{ bar }}
{% endmacro %}`), `<?php $foo = function($arg=null) use (&$foo) { ?>
Foo <?=$bar?>
<?php } ?>
`);

            test.same(transpiler.transpile(`{% macro foo(arg1, arg2) %}
Foo {{ bar }}
{% endmacro %}`), `<?php $foo = function($arg1=null,$arg2=null) use (&$foo) { ?>
Foo <?=$bar?>
<?php } ?>
`);

            test.same(transpiler.transpile(`{% macro foo(arg1 = 1) %}
Foo {{ bar }}
{% endmacro %}`), `<?php $foo = function($arg1=1) use (&$foo) { ?>
Foo <?=$bar?>
<?php } ?>
`);

            test.same(transpiler.transpile(`{% macro foo(arg1, arg2 = 1) %}
Foo {{ bar }}
{% endmacro %}`), `<?php $foo = function($arg1=null,$arg2=1) use (&$foo) { ?>
Foo <?=$bar?>
<?php } ?>
`);

            test.same(transpiler.transpile(`{{ _self.foo() }}`), `<?=$foo()?>`);
            test.same(transpiler.transpile(`{{ _self.foo("bar") }}`), `<?=$foo("bar")?>`);

            test.end();
        });

        test.test('supports is defined test', (test) => {
            test.same(transpiler.transpile('{% if foo is defined %}Foo{% endif %}'), `<?php if (isset($foo)): ?>Foo<?php endif; ?>`);
            test.same(transpiler.transpile('{{ foo is defined ? foo : "bar" }}'), '<?=isset($foo) ? $foo : "bar"?>');

            test.end();
        });

        test.end();
    });

    test.test('registerFunction', (test) => {
        let transpiler = new Transpiler();

        let message: string = 'should throw an exception when transpiling a non-registered function';

        try {
            transpiler.transpile(`{{foo("bar")}}`);

            test.fail(message);
        } catch (err) {
            test.pass(message);
        }

        transpiler.registerFunction('foo');

        test.same(transpiler.transpile(`{{foo("bar")}}`), `<?=foo("bar")?>`);

        test.end();
    });

    test.end();
});