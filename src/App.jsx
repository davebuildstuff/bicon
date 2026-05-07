import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import heroImg from "./assets/hero.png";
import rocket from "./assets/images/rocket---02.svg";
import clouds from "./assets/images/clouds.png";
import foreground from "./assets/images/foreground-mountain.png";
import background from "./assets/images/background-mountain.png";
import fadegrn from "./assets/images/fadeorg.png";
import logo from "./assets/images/logo-06.svg";
import pixArr from "./assets/images/pix_arrow.png";
import arrHead from "./assets/images/arr-head.png";
import grnArr from "./assets/images/pix_arrow-grn.png";
import qrcode from "./assets/images/qr.jpg";
import x from "./assets/images/x (1).jpg";

import "./App.css";
import {
  ArrowRight,
  Asterisk,
  CarFront,
  FireExtinguisher,
  HospitalIcon,
  Mail,
  MenuIcon,
  Square,
} from "lucide-react";
import BlurText from "./components/FadeIn";

function App() {
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
    window.addEventListener("mousemove", (e) => {
      setMouseXY([e.x, e.y]);
    });
  }, []);

  return (
    <>
      <div
        style={{ backgroundImage: "linear-gradient(black,transparent" }}
        className="Header z-30 fixed border-b border-white/10 top-0 w-full flex text-white justify-between items-center gap-6 p-6 md:px-8 "
      >
        {" "}
       <a href="/"> <img src={logo} alt="" className="logo w-[180px]" /></a>
        <div
          className="allLinks hidden linkTab backdrop-blur-md rounded-2xl p-2 text-sm
 text-white lg:flex items-center gap-2 bg-[#0e0e0e]/30 "
        >
          <div className="link p-3 px-5 rounded-xl duration-200">Products</div>

          <div className="link p-3 px-5 rounded-xl duration-200">Pricing</div>
          <div className="link p-3 px-5 rounded-xl duration-200">Services</div>
        </div>
        <div
          className="allCta hidden linkTab backdrop-blur-md rounded-2xl p-2 text-sm
 text-white lg:flex items-center gap-2 bg-[#0e0e0e]/30 "
        >
          <div className="link p-3 px-5 rounded-xl duration-200">Log in</div>

          <button className="bg-white cursor-pointer font-semibold text-black p-3 px-5 rounded-xl duration-200">
            {" "}
            Book Demo
          </button>
        </div>
        <MenuIcon className="lg:hidden" />
      </div>
      <div
        style={{
          overflowY: "scroll",
          visibility: launched ? "visible" : "hidden",
          opacity: launched ? 1 : 0,
          marginTop: launched ? 0 : "50px",
        }}
        className="BodyContent delay-2000 duration-1000 gap- h-screen max-h-screen fixed pt-40 flex flex-col items-center top-0 w-full mt-0 z-20  "
      >
        {/* <div
          onClick={() => {
            setLaunch(false);
          }}
          className=" bg-black p-2 px-4 rounded-full text-white "
        >
          BACK TO TOP
        </div> */}

        <div className="section1 sticky px-6 w-full max-w-[1200px] text-white flex flex-col items-center ">
          <div className="stan -mono-uppercase text-5xl md:text-6xl lg:text-7xl w-full text-center max-w-[550px] mb-8">
            What we are looking out for
          </div>
          <div className="AllFeatures w-full grid lg:grid-cols-3  gap-1">
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={
                launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}
              }
              transition={{
                duration: 1,
                ease: "easeOut",
                delay: 2.0,
              }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <HospitalIcon size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Health Emergency</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Reiciendis ab eum impedit. Recusandae deleniti perspiciatis
                  quis doloremque.
                </p>

                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className=" w-3" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={
                launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}
              }
              transition={{
                duration: 1,
                ease: "easeOut",
                delay: 2.2,
              }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <CarFront size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Motor Accident</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Reiciendis ab eum impedit. Recusandae deleniti perspiciatis
                  quis doloremque.
                </p>

                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className=" w-3" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
              animate={
                launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}
              }
              transition={{
                duration: 1,
                ease: "easeOut",
                delay: 2.4,
              }}
              className="FeatureCard text-black bg-white p-8"
            >
              <div className="w-full min-h-[240px]">
                <div className="feat-icon rounded-lg w-max bg-black text-lime-500 cursor-pointer p-3">
                  <FireExtinguisher size={35} />
                </div>
                <p className="mon feat-title mt-8 text-2xl">Fire Emergency</p>
                <p className="text-sm text-[#9c9c9c] py-4">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Reiciendis ab eum impedit. Recusandae deleniti perspiciatis
                  quis doloremque.
                </p>

                <div className="lmore font-semibold relative text-xs mt-6 pb-2 border-b border-[#9c9c9c]/40 flex items-center justify-between">
                  LEARN MORE
                  <img src={arrHead} alt="" className=" w-3" />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 60 }}
            animate={launched ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
            transition={{
              duration: 1,
              ease: "easeOut",
              delay: 2.6,
            }}
            className="w-full min-h-[300px] h-max border-l-4 flex lg:flex-row border-lime-500 bg-[#0e0e0e] text-white flex-col lg:items-center gap-4 "
          >
            <div className=" w-full flex  flex-col md:w-1/2 p-6 py-8">
              <p className="stan text-4xl md:text-5xl lg:text-6xl">
                The Next Big Revolution
              </p>

              <p className="text-sm text-[#9c9c9c] pt-4">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Cumque
                delectus magni soluta facilis eveniet, quasi at qui beatae.
              </p>
            </div>
            <img src={grnArr} alt="" className="self-end w-1/2 " />
          </motion.div>

          <img
            src={x}
            alt=""
            className="w-full h-[340px] object-center object-cover"
          />

          <div
            style={{ top: mouseXY[1] + "px", left: mouseXY[0] + "px" }}
            className="blobPad z-100 fixed mt-[8px] ml-[8px] duration-150 "
          >
            <div className="invertedCursor w-[90px] h-[90px] bg-black/0 "></div>
          </div>

         <div className="bg-[#0e0e0e] w-full grid md:grid-cols-2 items-center gap-4 p-4 md:p-6  ">
           <div className="Get-app w-full sticky-bottom-[-90vh] text-white ">
            <div className="section-title text-4xl lg:text-5xl">Get access to healthcare{" "}
            <span className="text-lime-500">anywhere in the world</span></div>
              <div className="form py-4 flex flex-col gap-2  items-start">
            <div className="input border p-2 flex items-center gap-4 border-[#9c9c9c]/30 w-full max-w-[350px] ">
             <Mail size={20 } /> <input className="outline-none text-sm" type="email" placeholder="Your email address" />
            </div>
            <div className="input border p-2 flex items-center gap-4 border-[#9c9c9c]/30 w-full max-w-[350px] ">
             <Asterisk size={20 } /> <input className="outline-none text-sm" type="password" placeholder="Create a password " />
            </div>

            <button className="sign-up w-full max-w-[350px] font-semibold bg-white text-black p-4">Sign Up</button>
          </div>
          </div>
          <div className="qr-section flex items-end
           p-4 w-full rounded-xl bg-[#466334] bg-blend-overlay h-[full] min-h-[470px]">
          
          <div className="qr-pad flex items-center justify-between pr-4 gap-1 w-full border bg-white rounded-2xl shadow-xl ">
              <img src={qrcode} alt="" className="qr-code rounded-2xl w-[7rem]" />
             <div className="text-black"> 
              <p style={{letterSpacing: -2}} className="text-xl md:text-2xl font-semibold">Get the app now </p>
             <p className="text-[#5b5b5b] text-sm"> Bicon mobile app available on appstore</p>  </div>
             <img src={pixArr} alt="" className="arr w-8" />
          </div>
          </div>
         </div>

        
        </div>
      </div>

      <div style={{ overflow: "hidden" }} className="SPACE-AND-LAND h-screen ">
        <div
          style={{ marginTop: launched ? 0 : "-100vh" }}
          className="MoonPad delay-400 -z-1 w-full h-screen duration-2000 ease-in-out "
        >
          <div
            style={{ aspectRatio: "1/1" }}
            className="moon  w-[80vw] h-[80vw] bg-amber-200/1 mx-auto bg-red-400/10- mt-16 lg:mt-40 rounded-full"
          ></div>
        </div>
        <img
          draggable={false}
          ref={rocketElement}
          // style={{ bottom: launched ? 0 : "-160px" }}
          src={rocket}
          alt=""
          className="Rocket h-screen fixed min-h-[200px] -bottom-40 z-10 duration-1500 -translate-x-1/2 left-1/2"
        />
        <img
          draggable={false}
          src={fadegrn}
          alt=""
          className="w-screen absolute bottom-0 z-3"
        />
        <div
          style={{ overflow: "hidden" }}
          className="LaunchSpace z-2 duration-500 h-screen relative bg--[#28292d]--"
        >
          <img
            draggable={false}
            src={clouds}
            className="w-full h-screen object-center absolute bottom-0 object-cover z-0"
          />
          <img
            draggable={false}
            src={background}
            alt=""
            style={{ bottom: launched ? "-100vh" : 0 }}
            className="w-screen delay-400 back-mountain z-1 absolute bottom-0 "
          />
          {/* <img draggable={false}
          style={{marginBottom: launch? "100vh" : 0}}
          src={rocket}
          alt=""
          className="h-screen absolute min-h-[200px] -bottom-40 z-10 duration-500 -translate-x-1/2 left-1/2"
        /> */}
          <img
            draggable={false}
            src={foreground}
            alt=""
            style={{ bottom: launched ? "-100vh" : 0 }}
            className="w-screen delay-400 fore-mountain absolute bottom-0 z-3"
          />
        </div>

        <div
          style={
            launched
              ? {
                  filter: "blur(4px)",
                  transform: "translateY(70px)",
                  opacity: 0,
                  visibility: "hidden",
                }
              : {
                  filter: "blur(0)",
                  transform: "translateY(0)",
                  opacity: 1,
                  visibility: "visible",
                }
          }
          className="HeroTexts z-20 absolute duration-700 gap-6 text-shadow-xl drop-shadow-2xl bottom-16 md:bottom-24 text-white text-center w-full flex flex-col items-center"
        >
          <div
            style={{ letterSpacing: -3 }}
            className="herotitle stan text-5xl  md:text-6xl lg:text-7xl max-w-[550px] flex flex-wrap items-center justify-center gap-3"
          >
            {HeroText.map((word) => (
              <BlurText
                key={HeroText.indexOf(word)}
                text={word}
                index={HeroText.indexOf(word)}
              />
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              delay: (HeroText.length + 1) * 0.2,
            }}
            className="text-white/60 max-w-[550px] text-sm"
          >
            Lorem ipsum dolor sit amet consectetur elit. Culpa, omnis nesciunt.
            Beatae sit cum nostrum unde! Quis, vitae?
          </motion.p>

          <motion.button
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              delay: (HeroText.length + 2) * 0.2,
            }}
            onClick={() => {
              setLaunch(true);
              rocketAnimation();
            }}
            className="cta flex items-center gap-2 rounded-md font-medium cursor-pointer bg-[#B7FF3B] active:duration-200 duration-75 active:translate-y-2 text-black p-3 pl-6 "
          >
            START LAUNCHING
            {/* <ArrowRight /> */}
            <img src={pixArr} alt="&rarr;" className=" w-6" />
          </motion.button>
        </div>
      </div>
    </>
  );
}

export default App;
