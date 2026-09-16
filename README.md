<!--
  Profile README for github.com/jameskbb. Hand-curated on purpose.

  To feature a project: copy one of the blocks under "Projects".
  Projects with a live demo get a full-width block; repo-only projects sit
  in the two-column table. Images live in assets/ (JPEG, ~1200px wide).
  Only projects worth a picture go on this page -- there is no overflow
  section, so anything that does not earn a block stays off it.

  The banner is generated, not hand-edited: assets/src/banner.html holds the
  layout and the palette copied from jameskrape.com; re-render both PNGs with
  `node assets/src/render-banner.mjs`.
-->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png">
  <img src="assets/banner-light.png" width="100%" alt="James Krape. Builder. Leader. Writer.">
</picture>

Data and analytics by day. The rest of the time I build data tools, AI experiments, things for the woodshop, and the occasional simulation that exists only because I wanted to know the answer.

The writing lives at **[jameskrape.com](https://jameskrape.com)**, including the longer stories behind these projects. The résumé lives on **[LinkedIn](https://www.linkedin.com/in/jameskrape)**.

## Projects

### [Fly Golf](https://github.com/jameskbb/fly-golf)

<a href="https://jameskbb.github.io/fly-golf/"><img src="assets/fly-golf.gif" width="100%" alt="Fly Golf gameplay: the simulated fly picks a club, swings, and sends the ball over a pond while its neural telemetry updates beside the course"></a>

Fly Golf takes the reconstructed wiring of a real fruit fly's brain (166,700 neurons, 25.6 million connections), simulates it spike by spike, and puts it on a 3D golf course. The fly picks a club from a full bag, lines up the shot and swings, with each decision read out of its neural activity. It hasn't broken 100 yet.

**[Live demo](https://jameskbb.github.io/fly-golf/)**&emsp;[Source](https://github.com/jameskbb/fly-golf)&emsp;<sub>`connectome` `spiking neural sim` `Three.js` `Python`</sub>

### [Lumber Cut Planner](https://github.com/jameskbb/lumber-cut-planner)

<a href="https://jameskbb.github.io/lumber-cut-planner/"><img src="assets/lumber-cut-planner.jpg" width="100%" alt="Lumber Cut Planner: a sheet of birch plywood laid out as a numbered cut plan"></a>

Tell it the plywood and boards you have and the parts you need. It lays out cuts a table saw can actually make, edge to edge with the blade kerf taken out, numbers them in the order you'll make them, and points out the offcuts worth keeping. It runs offline in a phone browser.

**[Live demo](https://jameskbb.github.io/lumber-cut-planner/)**&emsp;[Source](https://github.com/jameskbb/lumber-cut-planner)&emsp;<sub>`woodworking` `cut optimization` `offline web app`</sub>

<table>
<tr>
<td width="50%" valign="top">

<a href="https://github.com/jameskbb/blink-light"><img src="assets/blink-light.jpg" width="100%" alt="Blink Light: a blink(1) USB light glowing from a laptop port"></a>

### [Blink Light](https://github.com/jameskbb/blink-light)

A USB light that knows what my day is doing. It glows red while I'm in a meeting, flashes gold two minutes before standup, breathes blue when an AI coding agent finishes, and thumps orange when a CI run fails.

<sub>`Python` `hardware` `AI agents`</sub>

</td>
<td width="50%" valign="top">

<a href="https://github.com/jameskbb/homelab-public"><img src="assets/homelab.jpg" width="100%" alt="My Homelab: one retired desktop running apps, games and experiments"></a>

### [My homelab](https://github.com/jameskbb/homelab-public)

A retired office desktop running Proxmox with three jobs: everyday apps, game servers for friends, and a sandbox for experiments. Written as a guide for someone who has never run a server, backups and restores included.

<sub>`Proxmox` `self-hosting` `guide`</sub>

</td>
</tr>
</table>
