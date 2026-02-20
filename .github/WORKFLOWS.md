# GitHub Actions Workflows

Este documento describe los flujos de trabajo (workflows) de CI/CD configurados para FormaconIA.

## 🔄 Workflows Disponibles

### 1. Auth Service Tests (`auth-service-tests.yml`)

**Cuándo se ejecuta:**
- En cada push a `main`, `develop`, o ramas `feature/*`
- En cada pull request a `main` o `develop`
- Solo si hay cambios en `backend/packages/auth-service/**`

**Qué hace:**

#### Tests Matrix (Python 3.11, 3.12, 3.13)
```
✅ Unit Tests     - Pruebas unitarias de servicios y utilidades
✅ Integration    - Pruebas de flujos de trabajo completos
✅ Contract Tests - Pruebas de contrato API
✅ Coverage       - Reporte de cobertura de código
```

#### Quality Checks
```
✅ Linting (flake8)      - Sintaxis y estilo de código
✅ Type Checking (mypy)  - Verificación de tipos
✅ Docker Build          - Verifica que la imagen se construye
✅ Security Scan         - Trivy vulnerability scanner
```

**Artifacts generados:**
- `coverage-report-*.tar.gz` - Reporte HTML de cobertura
- `test-results-*.tar.gz` - Resultados de pytest

**Cómo verlo:**
1. Ve a tu PR o commit en GitHub
2. Click en la pestaña "Checks"
3. Expande "Auth Service Tests"
4. Visualiza logs de cada step

**Cómo interpretar resultados:**

```
✅ All checks passed    → Listo para merge
⚠️  Warnings (opcional) → Revisa pero no bloquea merge
❌ Test failed          → Corrige antes de merge
```

---

### 2. Code Quality (`code-quality.yml`)

**Cuándo se ejecuta:**
- En cada push a `main` o `develop`
- En cada pull request a `main` o `develop`

**Qué valida:**

| Check | Tool | Acción |
|-------|------|--------|
| Format | black | Verifica formato de código (bloquea si falla) |
| Imports | isort | Ordena imports automáticamente (bloquea si falla) |
| Security | bandit | Detecta vulnerabilidades (solo alerta) |
| Dependencies | safety | Chequea versiones con vulnerabilidades (solo alerta) |

**Nota:** Los checks de seguridad no bloquean el merge pero deberías revisar los warnings.

---

## 📊 Interpretando los Resultados

### Coverage Reports

Después de que terminen los tests, descarga el artifact `coverage-report-*`:

```bash
# Los reportes están en:
backend/packages/auth-service/htmlcov/index.html

# Abre en el navegador para ver:
- Cobertura total por módulo
- Líneas cubiertas/no cubiertas
- Tendencias en el tiempo
```

**Métricas de cobertura:**
- `> 85%` - Excelente
- `80-85%` - Bueno
- `< 80%` - Requiere mejora

### Failed Tests

Si algún test falla:

1. **Busca el test fallido en los logs**
   ```
   FAILED tests/unit/test_auth_service.py::test_register_valid_user
   ```

2. **Lee el error:**
   ```
   AssertionError: expected 201, got 400
   Expected: {"id": "...", "email": "test@example.com"}
   Got: {"detail": "Email already registered"}
   ```

3. **Causas comunes:**
   - Cambios en dependencias (requirements.txt)
   - Cambios en la base de datos (migrations)
   - Cambios en la API (schemas)

### Security Scan Results

Si Trivy encuentra vulnerabilidades:

1. **Críticas (CRITICAL)** - Corregir inmediatamente
2. **Altas (HIGH)** - Prioridad alta
3. **Medias (MEDIUM)** - Considerar en siguiente sprint
4. **Bajas (LOW)** - Monitorear

---

## 🚀 Casos de Uso

### Scenario 1: Merging a Feature

```bash
# 1. Push tu rama feature
git push origin feature/add-2fa

# 2. GitHub Actions ejecuta automáticamente
# - Tests en 3 versiones de Python
# - Coverage check
# - Security scan

# 3. Si todo pasa ✅
# Puedes hacer merge sin dudas

# 4. Si algo falla ❌
# - Revisa los logs
# - Corrige localmente
# - Push de nuevo (tests se reejecutarán)
```

### Scenario 2: Updating Dependencies

```bash
# Si actualizas requirements.txt:
pip install --upgrade fastapi

# 1. Los workflows detectarán el cambio
# 2. Reinstalarán dependencias en CI
# 3. Verificarán que no hay conflictos

# 4. Safety check buscará vulnerabilidades
# 5. Tests validarán compatibilidad
```

### Scenario 3: Performance Monitoring

```
# Los artifacts de coverage muestran tendencias:
Coverage report-3.12: 87.3%
Coverage report-3.13: 86.8%

# Si baja significativamente, investigar qué se removió
```

---

## 📋 Checklist para PRs

Antes de crear un PR, asegúrate que:

- [ ] Los cambios pasan `auth-service-tests.yml`
- [ ] Cobertura >= 80% (preferible > 85%)
- [ ] No hay warnings en code-quality
- [ ] No hay vulnerabilidades críticas
- [ ] Commits tienen mensajes descriptivos

---

## 🔧 Configuración Local

Para replicar los tests localmente:

```bash
cd backend/packages/auth-service

# Install dev dependencies
pip install -r requirements.txt

# Run tests locally (igual que CI)
pytest tests/unit -v
pytest tests/integration -v
pytest tests/contract -v

# Check coverage
pytest tests/ --cov=app --cov-report=html

# Format code (como hace black en CI)
black app tests

# Type check (como hace mypy en CI)
mypy app --ignore-missing-imports
```

---

## 📞 Troubleshooting

### "Tests pass locally but fail in CI"

**Causas:**
- Diferencia de versión Python
- Diferencia en dependencies (locked versions)
- Rutas absolutas (CI usa rutas relativas)

**Solución:**
```bash
# Usa la misma versión que CI
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/
```

### "Trivy scan shows vulnerabilities"

**Pasos:**
1. Ve a Security tab en GitHub
2. Revisa el SARIF report
3. Para cada vulnerability:
   - ¿Es en nuestra app o en dependencia?
   - ¿Hay patch disponible?
   - ¿Hay workaround?

### "Coverage dropped below 80%"

**Investigar:**
```bash
# Ver qué líneas no están cubiertas
coverage report -m

# HTML report con detalle
coverage html
# Abre htmlcov/index.html
```

---

## 📈 Best Practices

1. **Corre tests localmente antes de push**
   ```bash
   make test  # o pytest tests/
   ```

2. **Mantén coverage alto**
   - No bajes de 80%
   - Apunta a > 85%

3. **Revisa los artifacts**
   - Descarga coverage reports
   - Analiza tendencias

4. **Actualiza dependencias responsablemente**
   - Revisa changelogs
   - Corre tests después de actualizar

5. **Mantén workflows actualizados**
   - Revisa versions de actions
   - Actualiza matriz de Python según soporte oficial

---

## 📚 Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Pytest Documentation](https://docs.pytest.org/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)
- [Codecov Documentation](https://docs.codecov.io/)
