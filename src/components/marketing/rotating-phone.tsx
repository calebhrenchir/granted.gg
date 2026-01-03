import "../../../public/animations.css";

export default function RotatingPhone() {
  return (
    <section className="flex items-center justify-center min-h-screen max-w-screen overflow-hidden -mt-10">
        <div className="fade-in">
        <div className="hero-mask flex items-start justify-center h-[60vh] max-h-[640px]">
            <div className="hero-loop relative -top-24 md:-top-12 min-w-[calc(1840px-80px)] w-[calc(1840px-80px)] h-[calc(2312px-100px)]">
              <div
                className="absolute inset-0 mr-auto mb-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[315deg] p-4 translate-x-[200px] translate-y-[200px] z-10 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example2.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/0 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center fade-in">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50"></div>
                </div>
              </div>

              <div className="absolute inset-0 mx-auto mb-auto flex flex-shrink-0 p-4 justify-center h-[920px] w-[472px] z-20 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
               style={{
                 backgroundImage: `url("/screenshots/example1.png")`,
                 backgroundSize: "cover",
                 backgroundPosition: "center",
               }}>
                 <div className="absolute inset-0 rounded-[80px] bg-green-500/0 shadow-inner"></div>
                 <div className="absolute inset-0 flex items-center justify-center fade-in">
                   <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                 </div>
               </div>
              <div
                className="absolute inset-0 ml-auto mb-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[45deg] translate-x-[-200px] translate-y-[200px] z-10 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example3.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/0 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 ml-auto my-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[90deg] z-20 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example4.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 ml-auto my-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[90deg] z-20 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example5.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 ml-auto mt-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[135deg] translate-x-[-200px] translate-y-[-200px] z-10 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example6.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 mx-auto mt-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[180deg] z-20 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example7.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 mr-auto mt-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[225deg] translate-x-[200px] translate-y-[-200px] z-10 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example8.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
              <div
                className="absolute inset-0 mr-auto my-auto flex flex-shrink-0 justify-center h-[920px] w-[472px] rotate-[270deg] z-20 rounded-[80px] overflow-hidden shadow-mid shadow-red-500"
                style={{
                  backgroundImage: `url("/screenshots/example9.png")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 rounded-[80px] bg-green-500/20 shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[920px] w-[472px] rounded-[80px] border-4 border-white/50 backdrop-blur-sm"></div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </section>
  );
}