# Build stage
FROM rust:1.80 AS builder
WORKDIR /usr/src/r1ver
COPY . .
RUN cargo build --release

# Final stage
FROM debian:bookworm-slim
RUN apt-get update && \
    apt-get install -y libssl3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/r1ver/target/release/r1ver .
COPY pgcopy/ pgcopy/
ENTRYPOINT ["/r1ver"]
