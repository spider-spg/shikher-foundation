import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, 
  FaHandPaper, 
  FaHeart,
  FaUsers,
  FaDonate,
  FaGlobe,
  FaHandsHelping,
  FaChild,
  FaGraduationCap,
  FaRecycle,
  FaUserFriends,
  FaEye,
  FaBullseye,
  FaHandHoldingHeart,
  FaRibbon,
  FaCalendarAlt,
  FaGift
} from 'react-icons/fa';

const About = () => {

  const values = [
    { icon: FaHeart, title: 'Respect', description: 'We treat everyone with respect & dignity' },
    { icon: FaHandsHelping, title: 'Ethics', description: 'We strive to meet highest ethical standards' },
    { icon: FaUsers, title: 'Communication', description: 'Communication is the key in the organisation' },
    { icon: FaGlobe, title: 'Transparency', description: 'Our foundation is honest and transparent in the work we do' },
    { icon: FaGraduationCap, title: 'Creative', description: 'We create & innovate to achieve the mission of the foundation. Innovation is key to excellence' },
    { icon: FaDonate, title: 'Access to all', description: 'Our foundation is approachable & accessible to any individual. We do not discriminate on any basis' },
    { icon: FaBook, title: 'Learning', description: 'We constantly learn everyday from everyone which helps us to be updated with current trends & scenarios' }
  ];

  const charityProjects = [
    'Medical stall during Ganpati visarjan',
    'Donating handmade bags to blind people',
    'Donating books & toys to school on the eve of Children\'s Day',
    'Donating food to Old Age Home during festivals',
    'Was part of an entertainment event to raise money for social cause in our home town',
    'Participated in the initiative by Police department of Don\'t Drink & Drive'
  ];

  const events = [
    'Free DIY (recycling of old clothes and books) class',
    'Medical Camp',
    'Drawing competition on the eve of Children\'s Day',
    'Distributed Holy Book Bhagwat Gita on the eve of Geeta Jayanti',
    'Distributed clothes received in donation in Adivasi village',
    'Distributed cycle received in donation at small school in the tribal village',
    'Distributed toys & books on the eve of Children\'s Day',
    'Distributed old laptops, computers, mobiles received in donation to students for online classes in tribal area',
    'Participated in Various exhibition and organised donation drive',
    'We participated in exhibition and converted recycled old clothes to cloth bag live while the exhibition was going on',
    'Organized meditation camp for children on the eve of Children\'s Day',
    'Distributed new born essentials & food in government hospitals'
  ];



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 via-orange-600 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              About <span className="text-yellow-300">Shikher Foundations</span>
            </h1>
            <div className="bg-white bg-opacity-10 rounded-xl p-6 max-w-4xl mx-auto backdrop-blur-sm mb-8">
              <h3 className="text-xl font-bold mb-4">About Foundation</h3>
              <p className="text-lg text-gray-100 leading-relaxed">
                Shikher Foundation has taken an initiative of reducing waste. Reusing things, one has used or recycling the things by creating employment which will uplift rural area's development that are still untouched and play an important part of our country where charity is so engrained in the Indian spirit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 flex items-center justify-center">
              <FaRecycle className="mr-3 text-green-600" />
              About Us
            </h2>
            <div className="max-w-6xl mx-auto space-y-6 text-lg text-gray-700 leading-relaxed text-left">
              <p>
                Shikher foundation's journey began with the initiative "Say No to Plastic Bags" in early 2010 in remembering to 26 July water logging witnessing due to the excessive amount plastic bags used in our day-to-day life and recycling was inactive in Mumbai. We believed that this is not the ideal way to use and throw thing unused because it is harmful to the environment and our health. As eco-friendly alternatives already exist so, we initiated the cloth bags making project in underprivileged locality to surplus their income, targeting creative house wife and unemployed youth.
              </p>
              <p>
                It was an innovative initiative to sensitize and educate the society towards recycling everything for environmental protection and improvement with collecting old clothes, books etc... which are unused in their everyday lives and can be useful to someone.
              </p>
              <p>
                The passion to reduce pollution and support unemployment mega projects in rural areas and mass recycling units. With the realization that innovation is needed in the Recycling field to respond to the need for nature in our urbanizing cities. Shikher foundation started with collection of unwanted things within few societies and today continue to collect in Mumbai suburbs.
              </p>
              <p>
                We continue to involve communities, raise awareness, and encourage implementation on the ground, ultimately working together to create a healthy and pollution-free India.
              </p>
              <p>
                We at Shikher Foundation have group of women from rural as well as urban areas that have made many products out of old clothes and papers received in the form of donation which has helped them to earn supplement Income.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision, Mission, Values */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Vision */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <FaEye className="mx-auto text-4xl text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Vision</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our work aims to collect unwanted things from the urban spaces through recycling or reusing and rejuvenating the ecosystem, while creating opportunities for women & children. Our organisation is bringing talent to the table to explore the world and create future leaders.
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <FaBullseye className="mx-auto text-4xl text-green-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Mission</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our focus is to fight the waste management crisis and therefore we are working to provide sustainable solutions for a greener world through our projects Ecosystem and Sustainable Solutions.
                </p>
              </div>
            </div>

            {/* Impact */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <FaHandHoldingHeart className="mx-auto text-4xl text-orange-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Impact</h3>
                <p className="text-gray-700 leading-relaxed">
                  Since our inception we have received donation from 1000+ donors and continue to create lasting positive change in communities through environmental consciousness and women empowerment.
                </p>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">Our Values</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <value.icon className="text-3xl text-blue-600 mb-3 mx-auto" />
                  <h4 className="font-bold text-gray-900 mb-2">{value.title}</h4>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charity Projects */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center justify-center">
              <FaRibbon className="mr-3 text-green-600" />
              Charity Projects
            </h3>
            <p className="text-lg text-gray-600 mb-8">Our Foundation was part of these meaningful projects:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {charityProjects.map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 shadow-md">
                  <div className="flex items-start">
                    <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 mt-1">
                      {index + 1}
                    </span>
                    <p className="text-gray-700">{project}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center justify-center">
              <FaCalendarAlt className="mr-3 text-orange-600" />
              Events Organised
            </h3>
            <p className="text-lg text-gray-600 mb-8">Events organised by our foundation:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-md">
                  <div className="flex items-start">
                    <FaGift className="text-orange-600 mr-3 mt-1 text-lg" />
                    <p className="text-gray-700">{event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Volunteers Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center justify-center">
              <FaUserFriends className="mr-3 text-blue-600" />
              Volunteers
            </h3>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto mb-8">
              We believe there is no foundation without its volunteers. We would like to invite all individual from different walks of life to be a part of our team and follow our vision of women empowerment. Currently we have 50+ volunteers working for social cause and women empowerment.
            </p>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center justify-center">
              <FaDonate className="mr-3 text-green-600" />
              Donation
            </h3>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto mb-8">
              We want your support by gathering your unused items from your home and office which you will scrap not to ever use again. This may be scrap for you but can be new for someone in need. This donation will help to fulfil the basic needs of the under privileged people and donations help sustain our organization.
            </p>
          </div>
        </div>
      </section>

      {/* Special Events Mention */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">Special Events</h3>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-8">
            <h4 className="text-xl font-bold text-purple-800 mb-4">Hunar Ratna Awards 2019</h4>
            <p className="text-gray-700 leading-relaxed">
              We were the gifting partner at the award show. We had gifted Tulsi pot made out of cow dung waste along with tulsi sapling and handmade cloth bag made by our group of underprivileged women. All products were organic in nature.
            </p>
          </div>
        </div>
      </section>

      {/* Get Involved */}
      <section className="py-20 bg-gradient-to-br from-green-600 via-orange-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            Together we can create a healthy and pollution-free India while empowering women and supporting children.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
            <Link to="/donate" className="btn-white">
              Start Donating
            </Link>
            <Link to="/books" className="btn-outline-white">
              Explore Books
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;