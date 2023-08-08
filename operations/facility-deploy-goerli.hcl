job "facility-deploy-goerli" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "deploy-facility-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/ator-development/facilitator:0.4.1"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "goerli", "scripts/deploy.ts"]
        }

        vault {
            policies = ["facilitator-goerli"]
        }

        template {
            data = <<EOH
            {{with secret "kv/facilitator-goerli"}}
                DEPLOYER_PRIVATE_KEY="{{.Data.data.OWNER_KEY}}"
                CONSUL_TOKEN="{{.Data.data.CONSUL_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                GASOLATOR_ADDRESS="{{.Data.data.GASOLATOR_ADDRESS}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            PHASE="stage"
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            CONSUL_KEY="facilitator-goerli/address"
            ATOR_TOKEN_KEY="ator-goerli/address"
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
