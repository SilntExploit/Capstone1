FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        coreutils \
        curl \
        findutils \
        grep \
        iproute2 \
        iptables \
        lsof \
        net-tools \
        procps \
        python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/responsegrid

COPY seed/ /opt/responsegrid/seed/
COPY encrypt.sh /opt/responsegrid/encrypt.sh
COPY entrypoint.sh /opt/responsegrid/entrypoint.sh

RUN chmod +x /opt/responsegrid/encrypt.sh /opt/responsegrid/entrypoint.sh

ENTRYPOINT ["/opt/responsegrid/entrypoint.sh"]
