use std::collections::HashMap;

use rusqlite::Connection;

use super::{attr, escape, xsd_datetime};
use crate::db::collect;
use crate::error::AppResult;

/// Writes `<Variables>` and `<Cases>`. A typed attribute whose values do not all
/// parse as that type is exported as Text so the file stays schema-valid.
pub fn write_variables_and_cases(
    conn: &Connection,
    project_id: i64,
    xml: &mut String,
) -> AppResult<()> {
    let mut stmt = conn.prepare(
        "SELECT id, guid, name, value_type FROM attributes WHERE project_id = ?1 ORDER BY id",
    )?;
    let attributes = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
        ))
    })?)?;

    let mut values_stmt =
        conn.prepare("SELECT value FROM case_attribute_values WHERE attribute_id = ?1")?;
    let mut types: HashMap<i64, (String, &'static str)> = HashMap::new();
    if !attributes.is_empty() {
        xml.push_str("<Variables>\n");
        for (id, guid, name, declared) in &attributes {
            let values = collect(values_stmt.query_map([id], |r| r.get::<_, String>(0))?)?;
            let kind = effective_type(declared, &values);
            xml.push_str(&format!(
                "<Variable{}{}{}/>\n",
                attr("guid", guid),
                attr("name", name),
                attr("typeOfVariable", kind)
            ));
            types.insert(*id, (guid.clone(), kind));
        }
        xml.push_str("</Variables>\n");
    }

    let mut stmt = conn.prepare(
        "SELECT c.id, c.guid, c.name, s.guid FROM cases c LEFT JOIN sources s ON s.id = c.source_id
         WHERE c.project_id = ?1 ORDER BY c.id",
    )?;
    let cases = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?,
        ))
    })?)?;
    if cases.is_empty() {
        return Ok(());
    }
    let mut case_values =
        conn.prepare("SELECT attribute_id, value FROM case_attribute_values WHERE case_id = ?1")?;
    xml.push_str("<Cases>\n");
    for (id, guid, name, source_guid) in cases {
        xml.push_str(&format!(
            "<Case{}{}>",
            attr("guid", &guid),
            attr("name", &name)
        ));
        let values = collect(
            case_values.query_map([id], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?)))?,
        )?;
        for (attribute_id, value) in values {
            let Some((var_guid, kind)) = types.get(&attribute_id) else {
                continue;
            };
            let element = format!("{kind}Value");
            let value = if *kind == "Boolean" {
                normalise_bool(&value).to_string()
            } else {
                escape(&value)
            };
            xml.push_str(&format!(
                "<VariableValue><VariableRef{}/><{element}>{value}</{element}></VariableValue>",
                attr("targetGUID", var_guid)
            ));
        }
        if let Some(source_guid) = source_guid {
            xml.push_str(&format!("<SourceRef{}/>", attr("targetGUID", &source_guid)));
        }
        xml.push_str("</Case>\n");
    }
    xml.push_str("</Cases>\n");
    Ok(())
}

fn effective_type(declared: &str, values: &[String]) -> &'static str {
    let all = |ok: fn(&str) -> bool| values.iter().all(|v| ok(v.trim()));
    match declared {
        "Integer" if all(|v| v.parse::<i64>().is_ok()) => "Integer",
        "Float" if all(|v| v.parse::<f64>().is_ok()) => "Float",
        "Boolean"
            if all(|v| {
                matches!(
                    v.to_ascii_lowercase().as_str(),
                    "true" | "false" | "1" | "0"
                )
            }) =>
        {
            "Boolean"
        }
        _ => "Text",
    }
}

fn normalise_bool(value: &str) -> &'static str {
    match value.trim().to_ascii_lowercase().as_str() {
        "true" | "1" => "true",
        _ => "false",
    }
}

pub fn write_notes(conn: &Connection, project_id: i64, xml: &mut String) -> AppResult<()> {
    let mut stmt = conn.prepare(
        "SELECT guid, title, body, created_at FROM memos WHERE project_id = ?1 ORDER BY id",
    )?;
    let memos = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
        ))
    })?)?;
    if memos.is_empty() {
        return Ok(());
    }
    xml.push_str("<Notes>\n");
    for (guid, title, body, created_at) in memos {
        xml.push_str(&format!(
            "<Note{}{}{}><PlainTextContent>{}</PlainTextContent></Note>\n",
            attr("guid", &guid),
            attr("name", &title),
            attr("creationDateTime", &xsd_datetime(&created_at)),
            escape(&body),
        ));
    }
    xml.push_str("</Notes>\n");
    Ok(())
}
