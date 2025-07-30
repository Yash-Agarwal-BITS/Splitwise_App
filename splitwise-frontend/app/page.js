"use client";

import Link from "next/link";
import { Logo, Card, Button, PageLayout } from "@/components";

export default function HomePage() {
  return (
    <PageLayout>
      <div className="col-md-6 col-lg-4">
        <Card>
          <div className="text-center mb-4">
            <Logo size="2.5rem" />
            <p className="text-muted">
              Share expenses, split bills, and settle up with friends
            </p>
          </div>

          <div className="d-grid gap-3">
            <Link href="/login" className="text-decoration-none">
              <Button className="w-100">
                <i className="bi bi-box-arrow-in-right me-2"></i>Login
              </Button>
            </Link>
            <Link href="/signup" className="text-decoration-none">
              <Button variant="outline" className="w-100">
                <i className="bi bi-person-plus me-2"></i>Sign Up
              </Button>
            </Link>
          </div>

          <hr className="my-4" />

          <div className="text-center">
            <p className="text-muted small mb-0">New to expense sharing?</p>
            <p className="text-muted small">
              Splitwise makes it easy to split bills with friends!
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
