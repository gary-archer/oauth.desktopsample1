# authguidance.desktopsample1

### Overview

* A desktop sample using OAuth 2.0 and Open Id Connect, referenced in my blog at https://authguidance.com
* **The goal of this sample is integrating a Desktop UI + API with an external Authorization Server, with Good Usability**

### Details

* See the [Sample 1 Overview](https://authguidance.com/2018/01/11/desktop-apps-overview/) for details of how a Loopback Interface is used
* See the [Sample 1 Instructions](https://authguidance.com/2018/01/17/desktop-app-how-to-run-the-code-sample/) for infra setup and how to run the code

### Technologies

* Electron with TypeScript is used for the Desktop App, which can be run on Windows, Mac OS or Linux
* NodeJS with TypeScript and Inversify is used for the API

### Middleware Used

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* The [OpenId-Client Library](https://github.com/panva/node-openid-client) is used to handle API token validation
* The [Node Cache](https://github.com/mpneuried/nodecache) is used to cache API claims keyed against tokens
* Express is used to host both the API and the SPA content
* Okta is used for the Authorization Server
* OpenSSL is used for SSL certificate handling

