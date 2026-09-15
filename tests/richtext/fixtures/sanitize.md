# Inputs the sanitizer must stop

<p onclick="steal()">An event handler attribute.</p>

<a href="javascript:alert(1)">A javascript href</a>

<img src="data:text/html,<script>alert(1)</script>" alt="html data url">

<p style="background: url(https://evil/pixel.png)">A style with a url.</p>

<p style="width: expression(alert(1))">A style with an expression.</p>

<p style="position: fixed; top: 0; color: red">A positioned block.</p>

<iframe src="https://evil.example/frame"></iframe>

<script>document.body.innerHTML = ""</script>

<span is="evil-element">A custom element upgrade.</span>

<p contenteditable="true">An editable island.</p>

<p srcdoc="<script>x</script>" formaction="/steal" popover="auto" tabindex="0" hidden>Attributes the browser acts on.</p>

<span data-doc-block="fake" data-doc-atom class="md-li x">Reserved protocol attributes.</span>

# Inputs every allowed channel must pass

<p id="p1" class="note" title="tip" lang="en" dir="ltr" align="left" style="color: red; font-weight: bold">Allowed attributes.</p>

<a href="https://example.com/a" target="_blank" rel="noopener" title="Example">An allowed link</a> and <a href="mailto:x@example.com">mail</a> and <a href="tel:+123">tel</a> and <a href="#top">fragment</a> and <a href="../relative/path">relative</a>.

<img src="data:image/png;base64,iVBORw0KGgo=" alt="data image" width="16">

<span data-vn-ref="c02">A data attribute.</span>

<span aria-label="hint">An aria attribute.</span>

<span vn-ref="c03">A custom attribute outside the HTML vocabulary.</span>

<span closedby="any">An attribute newer than the vocabulary, kept as custom until the list learns it.</span>

<details open><summary>Open details</summary>kept open</details>
