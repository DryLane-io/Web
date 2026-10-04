// Raw harness output behind a toggle. Markup:
//   <details class="raw" data-log="logs/x.txt"><summary>...</summary></details>
// Logs that hold several platform runs ("--- LINUX --- ..." / "--- WINDOWS --- ...") get one
// switch button per run. textContent only: nothing from the log is trusted as markup.
(() =>
{
    const HEAD = /^--- (LINUX|WINDOWS) --- (.*?) ---\s*$/gm;

    function split(txt)
    {
        const marks = [...txt.matchAll(HEAD)];
        if (!marks.length) return [{ name: '', body: txt }];
        return marks.map((m, i) => ({
            name: m[1][0] + m[1].slice(1).toLowerCase() + ', ' + m[2],
            body: txt.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : txt.length).replace(/^\s*\n/, '')
        }));
    }

    function init(box)
    {
        const tabs = document.createElement('div');
        tabs.className = 'raw-tabs';
        const wrap = document.createElement('div');
        wrap.className = 'codebox';
        wrap.dataset.ink = 'box';
        const pre = document.createElement('pre');
        pre.className = 'logs';
        pre.textContent = 'loading…';
        wrap.appendChild(pre);
        box.append(tabs, wrap);

        fetch(box.dataset.log)
            .then(r => r.ok ? r.text() : Promise.reject(r.status))
            .then(txt =>
            {
                const runs = split(txt.replace(/\r/g, ''));
                const show = i =>
                {
                    pre.textContent = runs[i].body;
                    tabs.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', i === j));
                };
                if (runs.length > 1)
                    runs.forEach((r, i) =>
                    {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.textContent = r.name;
                        b.addEventListener('click', () => show(i));
                        tabs.appendChild(b);
                    });
                show(0);
            })
            .catch(() => { pre.textContent = 'log unavailable'; });
    }

    // Load at the end of <body> (sync): it runs before DOMContentLoaded, so ink.js outlines the codebox.
    document.querySelectorAll('details.raw[data-log]').forEach(init);
})();
