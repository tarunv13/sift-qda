# Security policy

Sift QDA is often used with sensitive research data, so we take security reports seriously.

## Supported versions

Only the latest release receives security fixes while the project is below 1.0.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting instead:
go to the **Security** tab of this repository and choose **Report a vulnerability**.

Please include the version, steps to reproduce, and the impact you expect. You should get a first
response within 7 days. We will agree a disclosure date with you once a fix is ready.

## Scope

Examples of issues we want to hear about:

- Crafted `.docx`, `.odt`, `.xlsx`, `.pdf` or `.qdpx` files that crash the app, read files outside
  the import, or execute code
- Any network traffic the app sends that the user did not configure
- Ways project data could be exposed to other local users or applications
