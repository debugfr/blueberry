# Static runtime notices

The vendored runtime files are unmodified package builds; Scramjet packages
are the versions installed by `@mercuryworkshop/proxy-bootstrap`:

| Package | Version | License | Upstream |
| --- | --- | --- | --- |
| `@mercuryworkshop/scramjet` | `2.0.67-alpha.2` | AGPL-3.0-only | <https://github.com/MercuryWorkshop/scramjet> |
| `@mercuryworkshop/scramjet-controller` | `0.0.14` | AGPL-3.0-only | <https://github.com/MercuryWorkshop/scramjet/tree/main/packages/controller> |
| `@mercuryworkshop/scramjet-utils` | `0.0.3` | AGPL-3.0-only | <https://github.com/MercuryWorkshop/scramjet/tree/main/packages/utils> |
| `@mercuryworkshop/libcurl-transport` | `2.0.6` | AGPL-3.0-only | <https://github.com/MercuryWorkshop/libcurl-transport> |
| `@mercuryworkshop/epoxy-transport` | `3.0.2` | AGPL-3.0-only | <https://github.com/MercuryWorkshop/epoxy-transport> |
| `@titaniumnetwork-dev/ultraviolet` | `3.2.10` | Package metadata says MIT; included `LICENSE` says AGPL-3.0 | <https://github.com/titaniumnetwork-dev/Ultraviolet> |
| `@mercuryworkshop/bare-mux` | `2.1.9` | MIT | <https://github.com/MercuryWorkshop/bare-mux> |

The AGPL-3.0 license text is in [licenses/AGPL-3.0.txt](./licenses/AGPL-3.0.txt).
The bundled libcurl.js component's LGPL-3.0 license text is in
[licenses/LGPL-3.0.txt](./licenses/LGPL-3.0.txt); its bundle also contains
notices for its included dependencies.

The Ultraviolet package's `package.json` declares MIT, but its distributed
`LICENSE` file contains AGPL-3.0 terms. The vendored BareMux package has no
license metadata or license file in its npm archive; its upstream repository
provides MIT terms in [licenses/BARE-MUX-MIT.txt](./licenses/BARE-MUX-MIT.txt).
These upstream licensing inconsistencies are recorded here; review them
before redistribution.
