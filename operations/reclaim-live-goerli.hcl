job "reclaim-live-goerli" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "reclaim-live-goerli-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/ator-development/facilitator:0.4.16"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "goerli", "scripts/reclaim.ts"]
        }

        vault {
            policies = ["facilitator-live-goerli"]
        }

        template {
            data = <<EOH
            {{with secret "kv/facilitator/goerli/live"}}
                CONSUL_TOKEN="{{.Data.data.CONSUL_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                FACILITY_OPERATOR_KEY="{{.Data.data.OPERATOR_KEY}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            FACILITY_CONTRACT_KEY="facilitator/goerli/live/address"
            DISTRIBUTION_CONTRACT_KEY="smart-contracts/live/distribution-address"
        }

        restart {
            attempts = 0
            mode = "fail"
        }

        resources {
            cpu    = 4096
            memory = 4096
        }
    }
}
