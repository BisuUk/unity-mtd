using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise
{
    public class Spheres
        : IModule
    {
        public double Frequency { get; set; }

        public Spheres()
        {
            Frequency = 1.0;
        }

        public double GetValue(double x, double y, double z)
        {
            x *= Frequency;
            y *= Frequency;
            z *= Frequency;

            double distFromCenter = System.Math.Sqrt(x * x + y * y + z * z);
            int xInt = (x > 0.0 ? (int)x : (int)x - 1);
            double distFromSmallerSphere = distFromCenter - xInt;
            double distFromLargerSphere = 1.0 - distFromSmallerSphere;
            double nearestDist = Math.GetSmaller(distFromSmallerSphere, distFromLargerSphere);
            return 1.0 - (nearestDist * 4.0); // Puts it in the -1.0 to +1.0 range.
        }
    }
}
