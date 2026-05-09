import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

import rocket from "../assets/images/rocket---02.svg";
import clouds from "../assets/images/clouds.png";
import foreground from "../assets/images/foreground-mountain.png";
import background from "../assets/images/background-mountain.png";
import fadegrn from "../assets/images/fadeorg.png";
import logo from "../assets/images/logo-06.svg";
import pixArr from "../assets/images/pix_arrow.png";
import arrHead from "../assets/images/arr-head.png";
import grnArr from "../assets/images/pix_arrow-grn.png";
import x from "../assets/images/x (1).jpg";

import "../App.css";
import { CarFront, FireExtinguisher, HospitalIcon, MenuIcon, Users } from "lucide-react";
import BlurText from "../components/FadeIn";

export default function LandingPage() {
  const [launched, setLaunch] = useState(false);
  const HeroText = "Propel signals that save lives.".split(" ");
  const rocketElement = useRef(null);

  function rocketAnimation() {
    if (!launched) {
      rocketElement.current.style.bottom = "0";
      setTimeout(() => {
        rocketElement.current.style.transitionDuration = "3s";
        rocketElement.current.style.bottom = "-80vh";
        rocketElement.current.style.filter = "blur(5px)";
      }, 500);
    }
  }

  const [mouseXY, setMouseXY] = useState([0, 0]);

  useEffect(() => {
    const handler = (e) => setMouseXY([e.x, e.y]);
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <>
      {/* Nav */}
      <div
        style={{ backgroundImage: "linear-gradient(black,transparent)" }}
        className="Header z-30 fixed border-b border-white/10 top-0 w-full flex text-white justify-between items-center gap-6 p-6 md:px-8"
      >
        <a href="/"><img src={logo} alt="Bicon" className="logo w-[180px]" /></a>

        <div className="allLinks hidden linkTab backdrop-blur-md rounded-2xl p-2 text-sm text-white lg:flex items-center gap-2 bg-[#0e0e0e]/30">
          <div className="link p-3 px-5 rounded-xl duration-200">Platform</div>
          <div className="link p-3 px-5 rounded-xl duration-200">How it works</div>
          <div className="link p-3 px-5 rounded-xl duration-200">Impact</div>
        </div>

        <div className="allCta hidden linkTab backdrop-blur-md rounded-2xl p-2 text-sm text-white lg:flex items-center gap-2 bg-[#0e0e0e]/30">
          <Link to="/login" className="link p-3 px-5 rounded-xl duration-200">
            Log in
          </Link>
          <Link
            to="/dashboard"
            className="bg-white cursor-pointer font-semibold text-black p-3 px-5 rounded-xl duration-200"
          >
            Open Dashboard
          </Link>
        </div>

        <MenuIcon className="lg:hidden text-white" />
      </div>

      {/* Scrollable body — revealed after launch */}
      <div
        style={{
          overflowY: "scroll",
          visibility: launched ? "visible" : "hidden",
          opacity: launched ? 1 : 0,
          marginTop: launched ? 0 : "50px",
        }}
        className="BodyContent delay-2000 duration-1000 gap- h-screen max-h-screen fixed pt-40 flex flex-col items-center top-0 w-full mt-0 z-20"
      >
        <div className="section1 sticky px-6 w-full max-w-[1200px] text-white flex flex-col items-center">
          <div className="stan -mono-uppercase text-5xl md:text-6xl lg:text-7xl w-full text-center max-w-[550px] mb-8">
            What we are looking out for
          </div>

          <div className="AllFeatures w-full grid lg:grid-cols-3 gap-1">
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
              transition={{ duration: 1, ease: "easeOut", delay: 2.0 }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <CarFront size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Road Accidents</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  Nokia network anomalies flag crashes before anyone calls. Our pipeline scores every
                  signal and puts a verified incident card on a dispatcher's screen in under 30 seconds.
                </p>
                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className="w-3" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
              transition={{ duration: 1, ease: "easeOut", delay: 2.2 }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <Users size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Crowd Crushes</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  A sudden device-density spike on the Nokia network reveals a crowd forming — before
                  the first emergency call is made. Bicon detects it and alerts wardens automatically.
                </p>
                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className="w-3" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
              transition={{ duration: 1, ease: "easeOut", delay: 2.4 }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <HospitalIcon size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Medical Emergencies</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  USSD triggers mean anyone with a feature phone — no internet, no smartphone — can
                  activate emergency response. 600M+ people in Sub-Saharan Africa are covered.
                </p>
                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className="w-3" />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
            animate={launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut", delay: 2.6 }}
            className="w-full min-h-[300px] h-max border-l-4 flex lg:flex-row border-lime-500 bg-[#0e0e0e] text-white flex-col lg:items-center gap-4"
          >
            <div className="w-full flex flex-col md:w-1/2 p-6 py-8">
              <p className="stan text-4xl md:text-5xl lg:text-6xl">
                The network already knows.
              </p>
              <p className="text-sm text-[#9c9c9c] pt-4">
                225,000 road deaths a year in the WHO African Region. Research shows half are caused
                by evacuation delay — not the crash itself. Bicon closes that gap.
              </p>
            </div>
            <img src={grnArr} alt="" className="self-end w-1/2" />
          </motion.div>

          <img src={x} alt="" className="w-full h-[340px] object-center object-cover" />

          <div
            style={{ top: mouseXY[1] + "px", left: mouseXY[0] + "px" }}
            className="blobPad z-100 fixed mt-[8px] ml-[8px] duration-150"
          >
            <div className="invertedCursor w-[90px] h-[90px] bg-black/0"></div>
          </div>

          {/* CTA section */}
          <div className="bg-[#0e0e0e] w-full grid md:grid-cols-2 items-center gap-4 p-4 md:p-6">
            <div className="Get-app w-full text-white">
              <div className="section-title text-4xl lg:text-5xl">
                Access the dispatcher{" "}
                <span className="text-lime-500">command centre</span>
              </div>
              <p className="text-sm text-[#9c9c9c] mt-4 max-w-[400px]">
                Real-time incident feed. AI-triaged alerts. Verified warden dispatch. Everything a
                dispatcher needs — on one live screen.
              </p>
              <Link
                to="/dashboard"
                className="cta inline-flex items-center gap-3 mt-8 font-medium cursor-pointer bg-[#B7FF3B] text-black p-3 pl-6 rounded-md"
              >
                OPEN DASHBOARD
                <img src={pixArr} alt="→" className="w-6" />
              </Link>
            </div>

            <div className="qr-section flex items-end p-4 w-full rounded-xl bg-[#466334] bg-blend-overlay h-full min-h-[470px]">
              <div className="bg-white rounded-2xl w-full p-6 flex flex-col gap-3">
                <p className="text-black text-2xl font-semibold" style={{ letterSpacing: -1 }}>
                  13 Nokia CAMARA APIs
                </p>
                <p className="text-[#5b5b5b] text-sm">
                  Identity · Location · Connectivity — combined into one Verified Emergency Score.
                  Signal to verified warden dispatch in under 30 seconds.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["SIM Swap", "Number Verification", "Location", "Geofencing", "QoD", "KYC Match", "Congestion"].map((api) => (
                    <span key={api} className="text-xs bg-black text-lime-400 px-3 py-1 rounded-full font-mono">
                      {api}
                    </span>
                  ))}
                  <span className="text-xs bg-black/10 text-black px-3 py-1 rounded-full font-mono">+6 more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero / launch pad */}
      <div style={{ overflow: "hidden" }} className="SPACE-AND-LAND h-screen">
        <div
          style={{ marginTop: launched ? 0 : "-100vh" }}
          className="MoonPad delay-400 -z-1 w-full h-screen duration-2000 ease-in-out"
        >
          <div
            style={{ aspectRatio: "1/1" }}
            className="moon w-[80vw] h-[80vw] mx-auto mt-16 lg:mt-40 rounded-full"
          />
        </div>

        <img
          draggable={false}
          ref={rocketElement}
          src={rocket}
          alt=""
          className="Rocket h-screen fixed min-h-[200px] -bottom-40 z-10 duration-1500 -translate-x-1/2 left-1/2"
        />
        <img draggable={false} src={fadegrn} alt="" className="w-screen absolute bottom-0 z-3" />

        <div style={{ overflow: "hidden" }} className="LaunchSpace z-2 duration-500 h-screen relative">
          <img draggable={false} src={clouds} className="w-full h-screen object-center absolute bottom-0 object-cover z-0" />
          <img
            draggable={false}
            src={background}
            alt=""
            style={{ bottom: launched ? "-100vh" : 0 }}
            className="w-screen delay-400 back-mountain z-1 absolute bottom-0"
          />
          <img
            draggable={false}
            src={foreground}
            alt=""
            style={{ bottom: launched ? "-100vh" : 0 }}
            className="w-screen delay-400 fore-mountain absolute bottom-0 z-3"
          />
        </div>

        {/* Hero text */}
        <div
          style={
            launched
              ? { filter: "blur(4px)", transform: "translateY(70px)", opacity: 0, visibility: "hidden" }
              : { filter: "blur(0)", transform: "translateY(0)", opacity: 1, visibility: "visible" }
          }
          className="HeroTexts z-20 absolute duration-700 gap-6 text-shadow-xl drop-shadow-2xl bottom-16 md:bottom-24 text-white text-center w-full flex flex-col items-center"
        >
          <div
            style={{ letterSpacing: -3 }}
            className="herotitle stan text-5xl md:text-6xl lg:text-7xl max-w-[550px] flex flex-wrap items-center justify-center gap-3"
          >
            {HeroText.map((word, i) => (
              <BlurText key={i} text={word} index={i} />
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: (HeroText.length + 1) * 0.2 }}
            className="text-white/60 max-w-[550px] text-sm"
          >
            Nokia network anomalies → 13 CAMARA API trust checks → Claude AI triage → verified
            warden dispatch. Under 30 seconds. No smartphone required.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: (HeroText.length + 2) * 0.2 }}
            onClick={() => {
              setLaunch(true);
              rocketAnimation();
            }}
            className="cta flex items-center gap-2 rounded-md font-medium cursor-pointer bg-[#B7FF3B] active:duration-200 duration-75 active:translate-y-2 text-black p-3 pl-6"
          >
            START LAUNCHING
            <img src={pixArr} alt="→" className="w-6" />
          </motion.button>
        </div>
      </div>
    </>
  );
}
