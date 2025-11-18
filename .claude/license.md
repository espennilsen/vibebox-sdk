# VibeBox Licensing Information

> **Task T195**: Licensing details and third-party attributions

## 📜 VibeBox License

VibeBox is released under the **MIT License**.

### MIT License

```
MIT License

Copyright (c) 2025 VibeBox Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### What This Means

✅ **You CAN**:
- Use VibeBox commercially
- Modify the source code
- Distribute modified versions
- Use VibeBox privately
- Sublicense the software

❌ **You CANNOT**:
- Hold the authors liable
- Use VibeBox trademarks without permission

⚠️ **You MUST**:
- Include the license and copyright notice
- State significant changes made to the code

---

## 🔧 Third-Party Licenses

VibeBox uses the following open-source libraries:

### Backend Dependencies

| Package | License | Purpose |
|---------|---------|---------|
| Fastify | MIT | Web framework |
| Prisma | Apache 2.0 | Database ORM |
| dockerode | Apache 2.0 | Docker API client |
| bcrypt | MIT | Password hashing |
| Passport.js | MIT | Authentication |
| Pino | MIT | Logging |
| TypeScript | Apache 2.0 | Type system |
| Vitest | MIT | Testing framework |

### Frontend Dependencies

| Package | License | Purpose |
|---------|---------|---------|
| React | MIT | UI framework |
| Material-UI | MIT | Component library |
| xterm.js | MIT | Terminal emulator |
| React Router | MIT | Routing |
| Vite | MIT | Build tool |
| TypeScript | Apache 2.0 | Type system |
| Vitest | MIT | Testing framework |
| Playwright | Apache 2.0 | E2E testing |

### Full Dependency List

For a complete list of dependencies and their licenses, see:
- `backend/package.json`
- `frontend/package.json`

Or run:
```bash
# Backend licenses
cd backend && npx license-checker --summary

# Frontend licenses
cd frontend && npx license-checker --summary
```

---

## 🎨 Attributions

### Design & Architecture

VibeBox was designed using:

- **Spec Kit** - Contract-first development framework by Anthropic
- **Claude Code** - AI-powered coding assistant by Anthropic

### Icons & Assets

- **Material Icons** (MIT License) - UI icons
- **Heroicons** (MIT License) - Additional icons

### Documentation

Documentation structure inspired by:
- **Stripe API Documentation**
- **GitLab Documentation**
- **Docker Documentation**

---

## 🏢 Commercial Use

### Can I use VibeBox commercially?

**Yes!** The MIT License explicitly allows commercial use.

You can:
- Deploy VibeBox for your company's internal use
- Offer VibeBox as a service to customers
- Include VibeBox in commercial products
- Charge for VibeBox support or hosting

### Requirements for Commercial Use

1. **Include the MIT License** in your distribution
2. **Include the copyright notice** from VibeBox
3. **Document modifications** you've made (recommended)

**Optional but appreciated**:
- Link back to VibeBox repository
- Contribute improvements back to the project
- Sponsor the project (if available)

---

## 🤝 Contributing

When contributing to VibeBox:

1. **Your contributions** will be licensed under MIT
2. **You confirm** you have the right to submit the code
3. **You agree** to the [Contributor License Agreement](../CLA.md) (if applicable)

See [CONTRIBUTING.md](../docs/CONTRIBUTING.md) for details.

---

## 🔒 Proprietary Components

### None Currently

VibeBox is 100% open source. All components are MIT licensed or compatible.

### Future Considerations

If proprietary extensions are added in the future:
- Core VibeBox remains MIT licensed
- Optional proprietary features clearly marked
- Documentation updated accordingly

---

## 📋 Compliance

### License Compatibility

VibeBox's MIT license is compatible with:
- Apache 2.0
- BSD licenses
- GPLv3 (VibeBox can be included in GPLv3 projects)
- Most permissive licenses

### Export Compliance

VibeBox may be subject to export controls. Users are responsible for:
- Compliance with local export laws
- Obtaining necessary export licenses
- Ensuring lawful use in their jurisdiction

---

## ❓ License FAQ

### Can I remove the MIT License notice?

**No**, the MIT license requires the notice to remain in all copies.

### Can I sell VibeBox?

**Yes**, you can charge for distributions, support, or hosting.

### Do I need to open-source my modifications?

**No**, MIT doesn't require you to share modifications (unlike GPL).

However, we encourage contributions back to the project!

### Can I rebrand VibeBox?

**Yes**, but you must:
- Keep the MIT license notice
- Mention it's based on VibeBox (recommended)
- Not imply endorsement by original authors

### What about VibeBox trademarks?

The VibeBox name and logos are not covered by MIT license. Contact us for trademark usage.

---

## 📞 License Questions

For licensing questions:
- **Email**: legal@vibebox.dev
- **GitHub**: Open a discussion with "licensing" label

---

## 📚 Related Documents

- [MIT License (Full Text)](https://opensource.org/licenses/MIT)
- [Open Source Initiative](https://opensource.org/)
- [Choose a License](https://choosealicense.com/licenses/mit/)

---

**Last Updated**: 2025-10-01
**License Version**: MIT (unchanged since project inception)
