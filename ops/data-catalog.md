# Data Catalog

## Overview

This document defines the data classification system and catalog structure for QuantaPilot, ensuring proper data governance, retention policies, and PII handling.

## Data Classification Classes

The system uses five data classification classes:

- **`public`** - Publicly accessible data, no restrictions
- **`internal`** - Internal business data, limited access
- **`operational`** - System operational data, technical access only
- **`pii`** - Personally Identifiable Information, restricted access
- **`secret`** - Highly sensitive data, minimal access

## Catalog Schema

The data catalog tracks the following attributes for each data artifact:

| Field            | Type    | Description                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| `dataset`        | string  | Dataset or schema name                                                 |
| `table`          | string  | Table or collection name                                               |
| `field`          | string  | Field or column name (optional for table-level classification)         |
| `class`          | enum    | Data classification class (public, internal, operational, pii, secret) |
| `retention_days` | integer | Data retention period in days                                          |
| `owner`          | string  | Data owner or steward                                                  |
| `pii_rule`       | enum    | PII handling rule (mask, hash, deny)                                   |

## Key Tables Mapping

### Application Data

| Dataset | Table       | Class       | Retention Days | Owner  | PII Rule |
| ------- | ----------- | ----------- | -------------- | ------ | -------- |
| `app`   | `run`       | operational | 90             | system | deny     |
| `app`   | `event_log` | operational | 30             | system | deny     |

### Audit Data

| Dataset | Table             | Class    | Retention Days | Owner    | PII Rule |
| ------- | ----------------- | -------- | -------------- | -------- | -------- |
| `audit` | `operator_action` | internal | 365            | security | mask     |

### PII Data

| Dataset | Table           | Class    | Retention Days | Owner   | PII Rule |
| ------- | --------------- | -------- | -------------- | ------- | -------- |
| `pii`   | `user`          | pii      | 2555           | privacy | hash     |
| `pii`   | `user_redacted` | internal | 2555           | privacy | mask     |

## Implementation Notes

- **Retention Policy**: Currently based on general retention guidelines, specific policies to be defined per table
- **Access Control**: Implemented through database roles and application-level permissions
- **PII Handling**:
  - `mask`: Data is masked in logs and non-production environments
  - `hash`: Data is hashed for analytics while preserving referential integrity
  - `deny`: Data access is completely restricted outside authorized contexts

## Compliance

This catalog supports:

- GDPR compliance through proper PII classification
- Data retention policies
- Access control implementation
- Audit trail requirements
