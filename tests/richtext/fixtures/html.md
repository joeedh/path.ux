# HTML in the source

<p>A plain paragraph element.</p>

<div>A div becomes a paragraph.</div>

<span>An inline element around a whole paragraph.</span>

<p style="color: red">A styled paragraph.</p>

<h2 style="text-align: center">A styled heading</h2>

<blockquote>A quote element.<blockquote>Nested quote.</blockquote></blockquote>

<ul><li>bullet</li><li>bullet two<ul><li>nested</li></ul></li></ul>

<ol><li>numbered</li><li><input type="checkbox" checked> task</li></ol>

<pre><code class="language-js">fence();
</code></pre>

<hr>

<table><tr><td>cell</td></tr></table>

<img src="pic.png" alt="pic" width="100">

Inline marks: <b>b</b> <strong>strong</strong> <i>i</i> <em>em</em> <u>u</u> <s>s</s> <del>del</del> <strike>strike</strike> <code>code</code> <a href="https://example.com" title="t">a</a>, a<br>break, <kbd>kbd</kbd>, <span style="color: blue">styled span</span>, <span data-vn-ref="c02">data span</span>, <span vn-ref="c03">custom span</span>.

<details><summary>Summary</summary>Body text.</details>

<video src="clip.mp4" controls></video>

<iframe src="https://example.com/embed"></iframe>

<section>An element not on the list keeps its content.</section>

<script>alert(1)</script>

<style>p { color: red }</style>

<form><input name="x"></form>

<!-- a comment -->

<div style="color: green">

Markdown inside a wrapper, with **bold**.

- and a list item

</div>

</div>

<div style="color: green"><p>Nested paragraph one.</p><p>Nested paragraph two.</p></div>

<div>loose text<p>then a paragraph</p></div>

<u>An unclosed tag, and </em>a stray closing one.

<span>one</span> then <span>two</span> in one paragraph.
