#pragma strict



static function PrefabName(type : int) : String
{
   var prefabName : String;
   //switch (type)
   //{
   //   default:
      prefabName = "prefabs/TowerPulsePrefab"; //break;
   //}
   return prefabName;
}


static function ScriptName(type : int) : String
{
   var scriptName : String;
   //switch (type)
   //{
   //   default:
      scriptName = "TowerPulse"; //break;
   //}
   return scriptName;
}


static function CreateAOEMesh(newAOE : float, scaleFactor : float) : Mesh
{
   var x : int; //Counter
   var stride : float = 1.0;

   //Create a new mesh
   var newAOEMesh : Mesh = new Mesh();

   //Vertices
   var vertex = new Vector3[newAOE/stride+3];

   vertex[0] = Vector3.zero;
   var r : Quaternion;
   var i = 1;
   for (x=-newAOE/2.0; x<=newAOE/2.0; x+=stride)
   {
      r = Quaternion.identity;
      r *= Quaternion.Euler(0, x, 0);
      vertex[i] = ((r*Vector3(0,0,1)*scaleFactor)); // one-over-localscale of parent.
      i += 1;
   }

   //UVs
   var uvs = new Vector2[vertex.length];
   for(x = 0; x < vertex.length; x++)
   {
      uvs[x] =  ((x%2) == 0) ? Vector2(0,0) : Vector2(1,1);
   }

   //Triangles
   var tris = new int[3 * (vertex.length - 2)];    //3 verts per triangle * num triangles
   var C1 : int = 0;
   var C2 : int = 1;
   var C3 : int = 2;

   for(x = 0; x < tris.length; x+=3)
   {
      tris[x] = C1;
      tris[x+1] = C2;
      tris[x+2] = C3;
      C2++;
      C3++;
   }

   //Assign data to mesh
   newAOEMesh.vertices = vertex;
   newAOEMesh.uv = uvs;
   newAOEMesh.triangles = tris;

   //Recalculations
   newAOEMesh.RecalculateNormals();
   newAOEMesh.RecalculateBounds();
   newAOEMesh.Optimize();

   //Name the mesh
   newAOEMesh.name = "FOVMesh";
   return newAOEMesh;
}
