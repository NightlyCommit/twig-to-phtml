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
{% endif %}`), `<?php if ($foo==5): ?>    TRUE
<?php endif; ?>`, 'if only');

            test.same(transpiler.transpile(`{% if (foo == 5) %}
    TRUE
{% else %}
    FALSE
{% endif %}`), `<?php if ($foo==5): ?>    TRUE
<php else: ?>    FALSE
<?php endif; ?>`, 'if and else');

            test.same(transpiler.transpile(`{% if (foo == 5) %}
    TRUE
{% elseif (foo == 4) %}
    FALSE
{% endif %}`), `<?php if ($foo==5): ?>    TRUE
<?php elseif ($foo==4): ?>    FALSE
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