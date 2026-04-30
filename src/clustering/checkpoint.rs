use crate::cards::street::Street;
use crate::clustering::histogram::Histogram;
use crate::gameplay::abstraction::Abstraction;
use byteorder::{ReadBytesExt, WriteBytesExt, BE};
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::PathBuf;

const MAGIC: &[u8; 8] = b"R1VRCKPT";
const VERSION: u32 = 1;

/// Resumable k-means state for a single street.
///
/// Written after each iteration of `Layer::cluster()` so an interrupted run
/// can pick up where it left off. Deleted once the street's final outputs
/// (isomorphism / metric / transitions) are written to pgcopy.
pub struct Checkpoint;

impl Checkpoint {
    pub fn path(street: Street) -> PathBuf {
        #[cfg(feature = "demo")]
        let subdir = "pgcopy/demo";
        #[cfg(not(feature = "demo"))]
        let subdir = "pgcopy";
        let path = format!(
            "{}/{}/checkpoint.{}",
            std::env::current_dir()
                .unwrap_or_default()
                .to_string_lossy(),
            subdir,
            street
        );
        if let Some(parent) = std::path::Path::new(&path).parent() {
            let _ = fs::create_dir_all(parent);
        }
        PathBuf::from(path)
    }

    pub fn exists(street: Street) -> bool {
        fs::metadata(Self::path(street)).is_ok()
    }

    pub fn delete(street: Street) {
        let path = Self::path(street);
        if path.exists() {
            log::info!("{:<32}{:<32}", "deleting    checkpoint", path.display());
            let _ = fs::remove_file(path);
        }
    }

    /// atomic save: write to .tmp then rename
    pub fn save(street: Street, iter: u32, centroids: &[Histogram]) {
        let path = Self::path(street);
        let tmp = path.with_file_name(format!("checkpoint.{}.tmp", street));
        {
            let file = File::create(&tmp).expect("create checkpoint tmp");
            let mut w = BufWriter::new(file);
            w.write_all(MAGIC).expect("magic");
            w.write_u32::<BE>(VERSION).expect("version");
            w.write_u32::<BE>(iter).expect("iter");
            w.write_u32::<BE>(centroids.len() as u32).expect("K");
            for c in centroids {
                w.write_u64::<BE>(c.mass() as u64).expect("mass");
                let counts = c.counts();
                w.write_u32::<BE>(counts.len() as u32).expect("n_entries");
                for (abs, count) in counts.iter() {
                    w.write_u64::<BE>(u64::from(*abs)).expect("abs");
                    w.write_u64::<BE>(*count as u64).expect("count");
                }
            }
            w.flush().expect("flush checkpoint");
        }
        fs::rename(&tmp, &path).expect("rename checkpoint");
        log::info!(
            "{:<32}{:<32}{}",
            "saved       checkpoint",
            path.display(),
            format!("iter {}", iter)
        );
    }

    /// returns (completed_iterations, centroids) or None if no checkpoint
    pub fn load(street: Street) -> Option<(u32, Vec<Histogram>)> {
        let path = Self::path(street);
        if !path.exists() {
            return None;
        }
        log::info!(
            "{:<32}{:<32}",
            "loading     checkpoint",
            path.display()
        );
        let file = File::open(&path).expect("open checkpoint");
        let mut r = BufReader::new(file);
        let mut magic = [0u8; 8];
        r.read_exact(&mut magic).expect("read magic");
        if &magic != MAGIC {
            log::warn!("checkpoint magic mismatch, ignoring");
            return None;
        }
        let version = r.read_u32::<BE>().expect("version");
        if version != VERSION {
            log::warn!("checkpoint version {} mismatch, ignoring", version);
            return None;
        }
        let iter = r.read_u32::<BE>().expect("iter");
        let k = r.read_u32::<BE>().expect("K") as usize;
        let mut centroids = Vec::with_capacity(k);
        for _ in 0..k {
            let _mass = r.read_u64::<BE>().expect("mass");
            let n = r.read_u32::<BE>().expect("n_entries") as usize;
            let mut h = Histogram::default();
            for _ in 0..n {
                let abs = Abstraction::from(r.read_u64::<BE>().expect("abs"));
                let count = r.read_u64::<BE>().expect("count") as usize;
                h.set(abs, count);
            }
            centroids.push(h);
        }
        Some((iter, centroids))
    }
}
