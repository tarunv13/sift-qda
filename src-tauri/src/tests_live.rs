//! Live semantic search against a running Ollama with nomic-embed-text.
//! Run with: cargo test live_ -- --ignored

use crate::ai::config::{EmbeddingConfig, DEFAULT_MODEL, DEFAULT_URL};
use crate::ai::{ollama::Embedder, vectors};
use crate::db::{self, projects};

#[test]
#[ignore = "needs Ollama running with nomic-embed-text"]
fn live_semantic_search_ranks_by_meaning() {
    let dir = std::env::temp_dir().join(format!("siftqda-live-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("live.db")).unwrap();
    vectors::ensure_table(&conn).unwrap();
    let project = projects::create(&conn, "Live", "").unwrap();

    let passages = [
        "I can't sleep during the summer because I keep worrying about the planet warming.",
        "The bus to the city centre was late again this morning.",
        "We planted tomatoes and beans in the community garden.",
    ];
    let embedder = Embedder::new(&EmbeddingConfig {
        url: DEFAULT_URL.into(),
        model: DEFAULT_MODEL.into(),
        chat_model: String::new(),
    });
    let texts: Vec<String> = passages.iter().map(|p| p.to_string()).collect();
    let embeddings = embedder.embed_documents(&texts).expect("Ollama embeddings");
    for (i, vector) in embeddings.iter().enumerate() {
        vectors::insert(&conn, i as i64 + 1, project.id, vector).unwrap();
    }

    let query = embedder.embed_query("climate anxiety").unwrap();
    let hits = vectors::knn(&conn, project.id, &query, 3).unwrap();
    println!("hits: {hits:?}");
    assert_eq!(
        hits[0].0, 1,
        "the climate passage should rank first even without shared keywords"
    );
}
