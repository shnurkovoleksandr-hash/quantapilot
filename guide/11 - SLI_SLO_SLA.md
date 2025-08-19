П.11 в целом реализован. Есть цели, метрики, политика ретраев и error-budget. Требуются точечные добивки.

# Что ок

- Политика ретраев, тайм-ауты, статусы ранa. Есть формулировка SLO «док-ген за минуты, milestone за часы».&#x20;
- Перечень SLI и цели по классам задач есть: lead time p95, step latency p95, success rate, pr_quality_rate, cost/tokens p95. SLO для `docgen/feature_xs/feature_s` определены. &#x20;
- SLA внешние зафиксированы: доступность 99.5%/мес, `queue_start_time_p95 ≤ 5 мин`, целевые реакции по P1/P2.&#x20;
- Error-budget описан и связан с бюджетами токенов/ретраями.&#x20;
- Наблюдаемость описана: логи, метрики, трассировка, алерты в Telegram. &#x20;

# Пробелы

- Часть спецификации SLI/SLO/SLA сформулирована на RU. В проекте принят EN-язык, нужно унифицировать. &#x20;
- Встречается ссылка на `ops/slo.yml`, но материализации файла не видно. Добавить.&#x20;
- Не определены «окна» измерения SLO (28/30/rolling 7d), пороги эскалаций и автоматизация проверки бюджета. Требуется формализовать.

# Что сделать (минимальные патчи, не конфликтуют с остальным планом)

1. Создать `ops/slo.yml`

```yaml
# ops/slo.yml
windows:
  reporting: 30d         # агрегирование SLO
  alert_eval: 1h         # как часто считаем алерты
task_classes:
  - id: docgen
    slo:
      e2e_lead_time_p95: "≤ 25m"
      success_rate: "≥ 95%"
      cost_p95_usd: "≤ 0.70"
  - id: feature_xs
    slo:
      e2e_lead_time_p95: "≤ 40m"
      success_rate: "≥ 90%"
      cost_p95_usd: "≤ 1.20"
  - id: feature_s
    slo:
      e2e_lead_time_p95: "≤ 60m"
      success_rate: "≥ 85%"
      cost_p95_usd: "≤ 2.00"
error_budget:
  metric: success_rate
  policy:
    warn: "spent >= 50%"   # код-фриз фич
    freeze: "spent >= 100%"# блок новых задач класса
sli:
  - id: e2e_lead_time_p95
    source: db
    query_ref: app.sql.sli.e2e_lead_time_p95
  - id: step_latency_p95
    source: db
    query_ref: app.sql.sli.step_latency_p95
  - id: success_rate
    source: db
    query_ref: app.sql.sli.success_rate
  - id: pr_quality_rate
    source: db
    query_ref: app.sql.sli.pr_quality_rate
  - id: cost_p95_usd
    source: db
    query_ref: app.sql.sli.cost_p95_usd
  - id: tokens_p95
    source: db
    query_ref: app.sql.sli.tokens_p95
  - id: queue_start_time_p95
    source: db
    query_ref: app.sql.sli.queue_start_time_p95
alerts:
  routes:
    - channel: telegram
      to: ${TELEGRAM_CHAT_ID}
      on: [warn, freeze]
```

Основание целей и метрик — действующие SLI/SLO/SLA. &#x20;

2. Зафиксировать «окна» и эскалации в EN
   В `docs/50_nonfunctional.md → Reliability / SLO` добавь абзац: rolling 30d window, hourly eval, policy «warn ≥50%, freeze ≥100% error-budget». Соответствует принятой политике.&#x20;

3. Синхронизировать язык
   Переписать RU-фрагменты SLI/SLO/SLA в `docs` на EN, сохранив текущие числа. Ссылки и структура остаются.&#x20;

4. Мини-скрипт проверки бюджета
   Добавь `scripts/slo-check.mjs` для чтения `ops/slo.yml`, выборки агрегатов из БД и вывода статуса (`OK/WARN/FREEZE`). Подключи как non-blocking чек в CI по расписанию. Источник показателей — уже описанные метрики в БД и нотификации в Telegram.&#x20;

5. Acceptance п.11 ✅ **ВЫПОЛНЕНО**

- ✅ `ops/slo.yml` в репозитории.
- ✅ В `docs/50_nonfunctional.md` всё на EN, упомянуто окно измерения и эскалации.
- ✅ Планировщик или CI-джоб формирует отчёт по бюджету и шлёт алерты в Telegram.
