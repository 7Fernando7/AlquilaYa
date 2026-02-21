# GitHub Actions & CI/CD

Bienvenido a la documentación de CI/CD de FormaconIA.

## 🚀 Quick Start

### For Developers

1. **Haz cambios en tu rama feature**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Push a GitHub**
   ```bash
   git push origin feature/my-feature
   ```

3. **GitHub Actions ejecutará automáticamente:**
   - ✅ Tests unitarios
   - ✅ Tests de integración
   - ✅ Análisis de cobertura
   - ✅ Linting y formateo
   - ✅ Escaneo de seguridad

4. **Crea un Pull Request**
   - Los checks deben pasar antes de merge
   - Revisa el tab "Checks" en tu PR

### For CI/CD Admins

Ver [WORKFLOWS.md](./WORKFLOWS.md) para documentación detallada sobre:
- Cómo configurar nuevos workflows
- Cómo interpretar resultados
- Cómo troubleshoot problemas

---

## 📋 Workflows Configurados

| Nombre | Trigger | Descripción |
|--------|---------|-------------|
| **Auth Service Tests** | Push/PR + cambios en auth-service | Tests + Coverage + Docker build |
| **Code Quality** | Push/PR a main/develop | Linting + Security checks |

---

## 📊 Dashboard

Ver el status de todos los workflows:
- GitHub UI: Tu repositorio → **Actions** tab
- Status badge en README:
  ```markdown
  ![Tests](https://github.com/YOUR_ORG/formacionia/actions/workflows/auth-service-tests.yml/badge.svg)
  ```

---

## ✅ Status Checks

En cada PR verás:

```
✅ All checks have passed
├─ auth-service-tests (Python 3.11)
├─ auth-service-tests (Python 3.12)
├─ auth-service-tests (Python 3.13)
├─ code-quality
└─ docker-build
```

**Verde** = Listo para merge
**Rojo** = Requiere fixes
**Amarillo** = En progreso

---

## 🔍 Debugging

### Ver logs de un workflow fallido

1. Ve a tu PR en GitHub
2. Click en "Checks" tab
3. Expande el workflow que falló
4. Click en el step que falló
5. Lee los logs detallados

### Rerun un workflow

Si los tests fallan por razones temporales (network timeout):

1. Click en el workflow fallido
2. Click "Re-run jobs"
3. GitHub reejecutará todos los tests

---

## 📈 Artifacts

Después de cada ejecución se generan:

- **Coverage Reports** - HTML report con cobertura de código
- **Test Results** - Resultados detallados de pytest
- **Docker Image** - Imagen verificada (no se pushea, solo check)

Para descargar:
1. Ve a Actions → Workflow run
2. Scroll al final → Artifacts
3. Click en el artifact que quieras

---

## 🛡️ Security

### Vulnerability Scanning

Cada PR automaticamente:
- ✅ Escanea código con Trivy
- ✅ Chequea dependencias con Safety
- ✅ Reporta a GitHub Security tab

### Review Requerido

- **Critical** - Revisar antes de merge
- **High** - Considerar review
- **Medium/Low** - Informativo

---

## 📞 Common Issues

### "CI passed locally but failed in GitHub"
→ Ver [WORKFLOWS.md#Troubleshooting](./WORKFLOWS.md#troubleshooting)

### "Tests are timing out"
→ Aumentar timeout en workflow o revisar logs

### "Need to skip a workflow"
→ Agrega `[skip ci]` al commit message (no recomendado)

---

## 🎯 Next Steps

1. Revisa [WORKFLOWS.md](./WORKFLOWS.md) para detalles
2. Crea un PR y observa los checks ejecutándose
3. Descarga un coverage report para analizar
4. Si necesitas agregar más workflows, documenta en WORKFLOWS.md

---

**Documentación actualizada:** 2026-02-20
**Versión:** 1.0
