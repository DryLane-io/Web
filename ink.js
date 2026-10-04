// Drafting-sheet ink for drylane.io inner pages. Load in <head> (not deferred): the classes
// must be set before first paint. js = outlines get injected; anim = strokes start undrawn.
(() => {
    const root = document.documentElement;
    root.classList.add('js');
    const animate = 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate) root.classList.add('anim');

    const NS = 'http://www.w3.org/2000/svg';

    // Shared pen filters (three seeds so neighbouring boxes don't wobble identically) + pencil hatch.
    const DEFS =
        [[3, 0.012], [11, 0.01], [27, 0.015]].map(([seed, f], i) =>
            // Region must cover the largest host (wide dashboard cards are ~1320 px); outside it the ink is clipped.
            `<filter id="rough${i}" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="-20" y="-20" width="3000" height="4000">` +
            `<feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="1" seed="${seed}" result="n"/>` +
            `<feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('') +
        '<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<line x1="0" y1="0" x2="0" y2="5" stroke="rgba(31,95,191,0.45)" stroke-width="1.2"/></pattern>';

    // Seeded so the overshoots are the same on every load.
    let s = 7;
    const rnd = (lo, hi) => lo + (hi - lo) * ((s = s * 16807 % 2147483647) / 2147483647);
    const many = (n, lo, hi) => Array.from({ length: n }, () => Math.round(rnd(lo, hi) * 10) / 10);

    // Four separate ruled strokes (top, right, bottom, left), each running o[] px past its
    // corners and nudged j[] px off true, so pencil corners cross instead of meeting.
    const edges = (w, h, o, j) =>
        `M${-o[0]} ${j[0]}L${w + o[1]} ${j[1]}` +
        `M${w + j[2]} ${-o[2]}L${w + j[3]} ${h + o[3]}` +
        `M${w + o[4]} ${h + j[4]}L${-o[5]} ${h + j[5]}` +
        `M${j[6]} ${h + o[6]}L${j[7]} ${-o[7]}`;

    function init()
    {
        const defs = document.createElementNS(NS, 'svg');
        defs.setAttribute('width', '0');
        defs.setAttribute('height', '0');
        defs.setAttribute('aria-hidden', 'true');
        defs.style.position = 'absolute';
        defs.innerHTML = '<defs>' + DEFS + '</defs>';
        document.body.prepend(defs);

        const ro = new ResizeObserver(entries => { for (const e of entries) e.target._ink(); });
        let seed = 0;

        // box / box2 (blue) / boxr (red) = rectangle, u = underline. Pencil (.c) first, ink (.k) over it.
        for (const host of document.querySelectorAll('[data-ink]'))
        {
            const kind = host.dataset.ink;
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'ink ' + kind);
            svg.setAttribute('aria-hidden', 'true');
            const c = document.createElementNS(NS, 'path');
            c.setAttribute('class', 'pen c');
            const g = document.createElementNS(NS, 'g');
            g.setAttribute('filter', 'url(#rough' + (seed++ % 3) + ')');
            const k = document.createElementNS(NS, 'path');
            k.setAttribute('class', 'pen k');
            g.appendChild(k);
            svg.append(c, g);
            host.appendChild(svg);

            const oc = many(8, 14, 30), jc = many(8, -1.5, 1.5);
            // Ink stops exactly at the corners; only the pencil runs past.
            host._ink = () =>
            {
                const w = host.offsetWidth, h = host.offsetHeight;
                if (kind === 'u')
                {
                    c.setAttribute('d', `M${-oc[0]} ${2 + jc[0]}L${w + oc[1]} ${2 + jc[1]}`);
                    k.setAttribute('d', `M0 2L${w} 2`);
                }
                else
                {
                    c.setAttribute('d', edges(w, h, oc, jc));
                    k.setAttribute('d', `M0 0H${w}V${h}H0Z`);
                }
            };
            host._ink();
            ro.observe(host);
            // No reveal root above it (e.g. a button): nothing will ever add .drawn, so draw now.
            if (!host.closest('[data-reveal]')) host.classList.add('drawn');
        }

        // Belt and braces: web fonts and late layout (charts) can resize hosts after init.
        const redraw = () => document.querySelectorAll('[data-ink]').forEach(h => h._ink && h._ink());
        if (document.fonts) document.fonts.ready.then(redraw);
        addEventListener('load', redraw);

        // Normalise every stroke to length 100 so one dash rule draws them all.
        for (const p of document.querySelectorAll('.pen')) p.setAttribute('pathLength', '100');

        const roots = document.querySelectorAll('[data-reveal]');
        if (!animate)
        {
            roots.forEach(r => r.classList.add('drawn'));
            return;
        }
        const io = new IntersectionObserver(entries =>
        {
            for (const e of entries)
                if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); }
        }, { rootMargin: '0px 0px -12% 0px' });   // not a ratio threshold: tall boxes must still fire
        roots.forEach(r => io.observe(r));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
