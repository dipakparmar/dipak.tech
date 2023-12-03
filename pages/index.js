import Link from "next/link";

export default function Home() {
  return (

    <div className="flex flex-col p-0 m-0 min-h-screen leading-6">
      <div className="px-10 pt-40 pb-8 my-0 mx-auto w-150 ">
        <h2 className="block sm:text-lg md:text-2xl lg:text-2xl p-0 mx-0 mt-0 mb-2 text-2xl">Hello <span>👋</span> </h2>
        <h2 className="sm:text-lg md:text-2xl lg:text-2xl mt-10 text-2xl">I&apos;m Dipak Parmar, a DevOps Engineer & Open Source developer 🧑🏻‍💻</h2>
        <h2 className="sm:text-lg md:text-2xl lg:text-2xl mt-10 bottom-5 text-2xl">Drop a letter at <Link href="mailto:hello@dipak.tech"> 📧 hello@dipak.tech</Link></h2>
      </div>
      
    </div>

  );
}
