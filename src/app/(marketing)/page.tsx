"use client";

import RotatingPhone from "@/components/marketing/rotating-phone";
import "../../../public/animations.css";
import Anim from "@/components/animation";
import { Iphone } from "@/components/ui/iphone";
import { Safari } from "@/components/ui/safari";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import StackedDevices from "@/components/marketing/stacked-devices";
import { FeatureRow, FeatureRowItem } from "@/components/marketing/feature-row";
import MoneyLoopCanvas from "@/components/marketing/canvases/money-loop";
import OnlineOnlyCanvas from "@/components/marketing/canvases/online-only";
import SellEverywhereCanvas from "@/components/marketing/canvases/sell-everywhere";
import SellAnythingCanvas from "@/components/marketing/canvases/sell-anything";
import CashOutCanvas from "@/components/marketing/canvases/cash-out";
import PrivacyFirstCanvas from "@/components/marketing/canvases/privacy-first";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen max-w-screen">    
      <RotatingPhone />

      <StackedDevices />

      <FeatureRow>
        <FeatureRowItem title="Price with no limits" description="Set your own price for your content." parentClasses="bg-green-500 inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <MoneyLoopCanvas />
        </FeatureRowItem>
        <FeatureRowItem title="Online only." description="No app to download.  Fully optimized for mobile." parentClasses="bg-[rgb(208,64,64)] inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <OnlineOnlyCanvas />
        </FeatureRowItem>
        <FeatureRowItem title="Sell anything." description="Up to 10 files.  Any type of content." parentClasses="bg-[rgb(25,25,25)] inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <SellAnythingCanvas />
        </FeatureRowItem>
        <FeatureRowItem title="Sell everywhere." description="Posts, stories, reels, and more." parentClasses="bg-[rgb(101,61,175)] inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <SellEverywhereCanvas />
        </FeatureRowItem>
      </FeatureRow>

      <section className="max-w-sm md:max-w-none text-center md:mb-24 mx-auto flex h-[50vh] w-full flex-col items-center justify-center gap-12 px-12 sm:h-auto sm:px-64">
        <h1 className="text-white font-semibold text-2xl">Make money off your PPV content.</h1>
      </section> 

      <FeatureRow>
        <FeatureRowItem title="Cash out anytime." description="Cash out your earnings anytime you want." parentClasses="bg-[rgb(0,0,0)] inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <CashOutCanvas />
        </FeatureRowItem>
        <FeatureRowItem title="Privacy first." description="All data is encrypted and stored securely.  All content is blurred and hashed." parentClasses="bg-[rgb(100,100,100)] inset-0 h-full w-full transition-opacity duration-300 ease-in-out">
          <PrivacyFirstCanvas />
        </FeatureRowItem>
        <FeatureRowItem title="Share and see who clicks." description="See who clicks your links and how many times they've been clicked."></FeatureRowItem>
        <FeatureRowItem title="Sell everywhere." description="Posts, stories, reels, and more."></FeatureRowItem>
      </FeatureRow>
    </div>
  );  
}
