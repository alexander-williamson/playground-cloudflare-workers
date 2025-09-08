locals {
  compatibility_date = formatdate("YYYY-MM-DD", timestamp())
}

# Worker

resource "cloudflare_worker" "tracker_worker" {
  account_id    = var.account_id
  name          = "tracker-worker"
  observability = { enabled = true }
}

resource "cloudflare_worker_version" "tracker_worker_version" {
  account_id         = var.account_id
  worker_id          = cloudflare_worker.tracker_worker.id
  compatibility_date = local.compatibility_date
  main_module        = "index.js"
  modules = [{
    name         = "index.js"
    content_type = "application/javascript+module"
    content_file = "../api/dist/index.js"
  }]
  bindings = [{
    id   = cloudflare_d1_database.tracker.id
    name = "DATABASE"
    type = "d1"
  }]
}

resource "cloudflare_workers_deployment" "tracker_deployment" {
  account_id  = var.account_id
  script_name = cloudflare_worker.tracker_worker.name
  strategy    = "percentage"
  versions = [{
    percentage = 100
    version_id = cloudflare_worker_version.tracker_worker_version.id
  }]
}

# DNS

resource "cloudflare_workers_route" "tracker" {
  zone_id = var.zone_id
  pattern = "${var.domain_name}/*"
  script  = cloudflare_worker.tracker_worker.name
}

resource "cloudflare_dns_record" "tracker_dns" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"
  content = "192.0.2.1" # placeholder - Cloudflare will proxy infront of this to the worker
  ttl     = 1
  proxied = true
}

# D1 (database))

resource "cloudflare_d1_database" "tracker" {
  name       = "tracker"
  account_id = var.account_id
  read_replication = {
    mode = "disabled"
  }
}