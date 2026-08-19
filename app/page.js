
import { Badge} from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link'
import Image from "next/image";
import { FEATURES, STEPS, TESTIMONIALS } from "@/lib/landing";
import { Card ,  CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Footer } from "react-day-picker";

export default function Home() {
  return (
    <div className=" flex flex-col pt-16">
      <section className="mt-10 pb-12 space-y-16 md:space-y-20 px-5">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <Badge variant="outline" className="bg-green-200 text-green-7000">
            Split Your Expenses.Simplify your finances
          </Badge>
          <h1 className=" gradient-title mx-auto max-w-4xl text-4xl font-bold md:text-7xl">
            The Smartest Way to Split Expenses with friends
          </h1>
          <p className="mx-auto max-w-175 text-gray-500 md:text-xl:/relaxed">
            Track shared expenses, split bills effortlessly and settle up
            quickly. never worry about who owes who again.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size={"lg"}
              className={"bg-green-600 hover:bg-green-700"}
            >
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size={"lg"}
              className={"border-green-600  text-green-600 hover:bg-green-50"}
            >
              <Link href="#how-it-works">How it Works</Link>
            </Button>
          </div>
        </div>

        <div className="container mx-auto  max-w-5xl overflow-hidden rounded-xl shadow-xl">
          <div className="gradient p-1 aspect-video">
            <Image
              src="/hero.png"
              width={1280}
              height={720}
              alt="banner"
              className="rounded-lg mx-auto"
              priority
            />
          </div>
        </div>
      </section>

      <section id="features" className=" bg-gray-50 py-20">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <Badge variant="outline" className="bg-green-100 text-green-700">
            Features
          </Badge>
          <h2 className="gradient-title mt-2 text-3xl md:text-4xl">
            Everything you need to split expenses
          </h2>
          <p className="mx-auto mt-3 max-w-[700] text-gray-500 md:text-xl/related">
            The Platform provides all the tools you need to manage your shared
            expenses with ease
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 mg:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, Icon, description, bg, color }) => (
              <Card
                key={title}
                className="flex flex-col items-center space-y-4 p-6 text-center"
              >
                <div className={`rounded-full p-3 ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-500">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <Badge variant="outline" className="bg-green-100 text-green-700">
            How It Works
          </Badge>
          <h2 className="gradient-title mt-2 text-3xl md:text-4xl">
            Splitting expenses have never been easier
          </h2>
          <p className="mx-auto mt-3 max-w-[700] text-gray-500 md:text-xl/related">
            Follow these simple steps to start tracking and splitting expenses
            with friends
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
            {STEPS.map(({ description, label, title }) => (
              <div key={title} className="flex flex-col items-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600">
                  {label}
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-500 text-center">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className=" bg-gray-50 py-20">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <Badge variant="outline" className="bg-green-100 text-green-700">
            Testimonials
          </Badge>
          <h2 className="gradient-title mt-2 text-3xl md:text-4xl">
            What users are Saying
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl md:grid-cols-2 gap-8 lg:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, image, role }) => (
              <Card key={name}>
                <CardContent className="space-y-4 p-6">
                  <p className="text-gray-500">{quote}</p>
                  <div className=" flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={image} alt={name} />
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">{role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 gradient">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Ready to simplify expense sharing
          </h2>

          <p className="mx-auto max-w-150 text-green-100 md:text-xl/relaxed">
              Join In And Start Splitting Your Expenses Stress Free
          </p>

          <Button asChild size="lg" className="bg-green-600 hover:opacity-90">
            <Link href="/dashboard">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4"/>
            </Link>
          </Button>
        </div>
      </section>
      
     <footer className="border-t bg-gray-50 py-12 text-center text-sm text-muted-foreground">
      Made By Piyush
     </footer>
    </div>
  );
}


