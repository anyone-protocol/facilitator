job "test-generate-accounts-goerli" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "test-generate-accounts-goerli-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/ator-development/facilitator:0.4.7"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "goerli", "scripts/generate-accounts.ts"]
        }

        vault {
            policies = ["facilitator-goerli"]
        }

        template {
            data = <<EOH
            {{with secret "kv/facilitator-goerli"}}
                CONSUL_TOKEN="{{.Data.data.CONSUL_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                FACILITY_OPERATOR_KEY="{{.Data.data.OPERATOR_KEY}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            PHASE="stage"
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            FACILITY_CONTRACT_KEY="facilitator-goerli/address"
            TEST_ACCOUNTS_KEY="facilitator-goerli/test-accounts"
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
