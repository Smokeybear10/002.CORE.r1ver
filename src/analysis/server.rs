use super::api::API;
use super::request::*;
use crate::cards::observation::Observation;
use crate::cards::street::Street;
use crate::gameplay::abstraction::Abstraction;
use crate::gameplay::action::Action;
use crate::gameplay::recall::Recall;
use crate::gameplay::turn::Turn;
use actix_cors::Cors;
use actix_web::middleware::Logger;
use actix_web::web;
use actix_web::App;
use actix_web::HttpResponse;
use actix_web::HttpServer;
use actix_web::Responder;

pub struct Server;

impl Server {
    pub async fn run() -> Result<(), std::io::Error> {
        let api = web::Data::new(API::from(crate::db().await));
        log::info!("starting HTTP server");
        HttpServer::new(move || {
            App::new()
                .wrap(Logger::new("%r %s %Ts"))
                .wrap(
                    Cors::default()
                        .allow_any_origin()
                        .allow_any_method()
                        .allow_any_header(),
                )
                .app_data(api.clone())
                .route("/replace-obs", web::post().to(replace_obs))
                .route("/nbr-any-abs", web::post().to(nbr_any_wrt_abs))
                .route("/nbr-obs-abs", web::post().to(nbr_obs_wrt_abs))
                .route("/nbr-abs-abs", web::post().to(nbr_abs_wrt_abs))
                .route("/nbr-kfn-abs", web::post().to(kfn_wrt_abs))
                .route("/nbr-knn-abs", web::post().to(knn_wrt_abs))
                .route("/nbr-kgn-abs", web::post().to(kgn_wrt_abs))
                .route("/exp-wrt-str", web::post().to(exp_wrt_str))
                .route("/exp-wrt-abs", web::post().to(exp_wrt_abs))
                .route("/exp-wrt-obs", web::post().to(exp_wrt_obs))
                .route("/hst-wrt-abs", web::post().to(hst_wrt_abs))
                .route("/hst-wrt-obs", web::post().to(hst_wrt_obs))
                .route("/blueprint", web::post().to(blueprint))
                // every other route is POST-only, so hosting platforms have nothing to
                // probe for liveness without this
                .route("/health", web::get().to(health))
        })
        .workers(6)
        // Bind all interfaces when hosted — a loopback bind is unreachable from
        // outside the container. PORT is what most platforms inject.
        .bind((
            std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3002),
        ))?
        .run()
        .await
    }
}

// Route handlers

async fn health(api: web::Data<API>) -> impl Responder {
    // a liveness probe that doesn't touch the database would stay green while every
    // real route 500s, so check the connection too. cover every street: the river is
    // the one that doesn't join the isomorphism table, so probing a single street
    // leaves the path most likely to break unmonitored.
    for street in [Street::Pref, Street::Flop, Street::Turn, Street::Rive] {
        if let Err(e) = api.exp_wrt_str(street).await {
            return HttpResponse::ServiceUnavailable()
                .body(format!("{} lookup failed: {}", street, e));
        }
    }
    HttpResponse::Ok().json(serde_json::json!({ "status": "ok" }))
}

async fn replace_obs(api: web::Data<API>, req: web::Json<ReplaceObs>) -> impl Responder {
    let obs = Observation::try_from(req.obs.as_str());
    match obs {
        Err(_) => HttpResponse::BadRequest().body("invalid observation format"),
        Ok(obs) => match api.replace_obs(obs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(new) => HttpResponse::Ok().json(new.equivalent()),
        },
    }
}

async fn exp_wrt_str(api: web::Data<API>, req: web::Json<SetStreets>) -> impl Responder {
    let street = Street::try_from(req.street.as_str());
    match street {
        Err(_) => HttpResponse::BadRequest().body("invalid street format"),
        Ok(street) => match api.exp_wrt_str(street).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(row) => HttpResponse::Ok().json(row),
        },
    }
}
async fn exp_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceAbs>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    match wrt {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(abs) => match api.exp_wrt_abs(abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(row) => HttpResponse::Ok().json(row),
        },
    }
}
async fn exp_wrt_obs(api: web::Data<API>, req: web::Json<RowWrtObs>) -> impl Responder {
    let obs = Observation::try_from(req.obs.as_str());
    match obs {
        Err(_) => HttpResponse::BadRequest().body("invalid observation format"),
        Ok(obs) => match api.exp_wrt_obs(obs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(row) => HttpResponse::Ok().json(row),
        },
    }
}

async fn nbr_any_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceAbs>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    match wrt {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(abs) => match api.nbr_any_wrt_abs(abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(row) => HttpResponse::Ok().json(row),
        },
    }
}
async fn nbr_abs_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceOne>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    let abs = Abstraction::try_from(req.abs.as_str());
    match (wrt, abs) {
        (Err(_), _) => HttpResponse::BadRequest().body("invalid abstraction format"),
        (_, Err(_)) => HttpResponse::BadRequest().body("invalid abstraction format"),
        (Ok(wrt), Ok(abs)) if wrt.street() != abs.street() => HttpResponse::BadRequest()
            .body("both abstractions must be on the same street to be comparable"),
        (Ok(wrt), Ok(abs)) => match api.nbr_abs_wrt_abs(wrt, abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(row) => HttpResponse::Ok().json(row),
        },
    }
}
async fn nbr_obs_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceRow>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    let obs = Observation::try_from(req.obs.as_str());
    match (wrt, obs) {
        (Err(_), _) => HttpResponse::BadRequest().body("invalid abstraction format"),
        (_, Err(_)) => HttpResponse::BadRequest().body("invalid observation format"),
        // the metric only holds within-street pairs, so a cross-street comparison has no
        // distance to report — that's a bad request, not a server fault.
        (Ok(abs), Ok(obs)) if abs.street() != obs.street() => HttpResponse::BadRequest()
            .body("the observation and abstraction must be on the same street"),
        (Ok(abs), Ok(obs)) => match api.nbr_obs_wrt_abs(abs, obs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(rows) => HttpResponse::Ok().json(rows),
        },
    }
}

async fn kfn_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceAbs>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    match wrt {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(abs) => match api.kfn_wrt_abs(abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(rows) => HttpResponse::Ok().json(rows),
        },
    }
}
async fn knn_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceAbs>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    match wrt {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(abs) => match api.knn_wrt_abs(abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(rows) => HttpResponse::Ok().json(rows),
        },
    }
}
async fn kgn_wrt_abs(api: web::Data<API>, req: web::Json<ReplaceAll>) -> impl Responder {
    let wrt = Abstraction::try_from(req.wrt.as_str());
    match wrt {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(wrt) => {
            let obs = req
                .neighbors
                .iter()
                .map(|string| string.as_str())
                .map(Observation::try_from)
                .filter_map(|result| result.ok())
                .filter(|o| o.street() == wrt.street())
                .chain((0..).map(|_| Observation::from(wrt.street())))
                .take(5)
                .collect::<Vec<_>>();
            match api.kgn_wrt_abs(wrt, obs).await {
                Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
                Ok(rows) => HttpResponse::Ok().json(rows),
            }
        }
    }
}

async fn hst_wrt_abs(api: web::Data<API>, req: web::Json<AbsHist>) -> impl Responder {
    let abs = Abstraction::try_from(req.abs.as_str());
    match abs {
        Err(_) => HttpResponse::BadRequest().body("invalid abstraction format"),
        Ok(abs) => match api.hst_wrt_abs(abs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(rows) => HttpResponse::Ok().json(rows),
        },
    }
}

async fn hst_wrt_obs(api: web::Data<API>, req: web::Json<ObsHist>) -> impl Responder {
    let obs = Observation::try_from(req.obs.as_str());
    match obs {
        Err(_) => HttpResponse::BadRequest().body("invalid observation format"),
        Ok(obs) => match api.hst_wrt_obs(obs).await {
            Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
            Ok(rows) => HttpResponse::Ok().json(rows),
        },
    }
}

async fn blueprint(api: web::Data<API>, req: web::Json<GetPolicy>) -> impl Responder {
    let hero = Turn::try_from(req.turn.as_str());
    let seen = Observation::try_from(req.seen.as_str());
    let path = req
        .past
        .iter()
        .map(|string| string.as_str())
        .map(Action::try_from)
        .collect::<Result<Vec<_>, _>>();
    match (hero, seen, path) {
        (Ok(hero), Ok(seen), Ok(path)) => {
            let recall = Recall::from((hero, seen, path));
            // Game::act asserts legality, so an impossible history would panic the worker
            // rather than reach the query. Blinds are already posted at the root, and the
            // board must match the cards revealed by the history.
            if !recall.consistent() {
                return HttpResponse::BadRequest()
                    .body("board does not match the cards dealt in the action history");
            }
            if !recall.legal() {
                return HttpResponse::BadRequest().body(
                    "illegal action history (blinds are already posted; \
                     CALL and RAISE amounts are chips added to your current stake)",
                );
            }
            match recall.head().turn() {
                Turn::Terminal => {
                    return HttpResponse::BadRequest()
                        .body("the hand is over — no decision to make at a terminal state")
                }
                Turn::Chance => {
                    return HttpResponse::BadRequest().body(
                        "it is the dealer's turn — reveal the next street with a DEAL action \
                         before asking for a strategy",
                    )
                }
                // the query is keyed on the game state, not on `turn`, so a mismatched player
                // would silently get a strategy for whoever is actually to act
                Turn::Choice(seat) if hero != Turn::Choice(seat) => {
                    return HttpResponse::BadRequest()
                        .body(format!("it is P{}'s turn to act, not {}", seat, hero))
                }
                Turn::Choice(_) => {}
            }
            match api.policy(recall).await {
                Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
                Ok(rows) if rows.is_empty() => HttpResponse::NotFound()
                    .body("the blueprint has no strategy trained for this game state"),
                Ok(rows) => HttpResponse::Ok().json(rows),
            }
        }
        _ => HttpResponse::BadRequest().body("invalid recall format"),
    }
}
