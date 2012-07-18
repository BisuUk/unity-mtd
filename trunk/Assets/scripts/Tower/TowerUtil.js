#pragma strict



static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      case 1:
         prefabName = "prefabs/TowerPulsePrefab";
      break;

      case 2:
         prefabName = "prefabs/TowerAOEPrefab";
      break;
   }
   return prefabName;
}

static function CreateAOEMesh(newAOE : float, scaleFactor : float) : Mesh
{
   var x : int; //Counter
   var stride : float = 10.0;
   var height : float = 0.5;

   //Create a new mesh
   var newAOEMesh : Mesh = new Mesh();

   //Vertices
   var vertex = new Vector3[(newAOE/stride+3)*2];

   // 11 sides, 22 tris

   // Sides
   vertex[0] = Vector3.zero + Vector3(0, -height/2.0, 0);
   vertex[1] = Vector3.zero + Vector3(0, height/2.0, 0);
   var r : Quaternion;
   var i = 2;
   for (x=-newAOE/2.0; x<=newAOE/2.0; x+=stride)
   {
      r = Quaternion.identity;
      r *= Quaternion.Euler(0, x, 0);
      vertex[i] = ((r*Vector3(0,0,1)*scaleFactor));
      vertex[i].y -= height/2.0;
      i += 1;
      vertex[i] = vertex[i-1] + Vector3(0, height, 0);
      i += 1;
   }
   vertex[i] = vertex[0];
   i += 1;
   vertex[i] = vertex[1];
   i += 1;

   //UVs
   var uvs = new Vector2[vertex.length];
   for(x = 0; x < vertex.length; x++)
   {
      uvs[x] =  ((x%2) == 0) ? Vector2(0,0) : Vector2(1,1);
   }

   //Triangles

   var tris = new int[3*(vertex.length-2)];    //3 verts per triangle * num triangles

   //Debug.Log("vl="+vertex.length+" na="+newAOE+" sd="+(newAOE/stride)+" tl="+tris.length);

   var C1 : int = 0;
   var C2 : int = 1;
   var C3 : int = 2;

   var b : boolean = false;
   for(x = 0; x < tris.length; x+=3)
   {
      tris[x] = C1;
      tris[x+1] = b ? C3 : C2;
      tris[x+2] = b ? C2 : C3;
      C1++;
      C2++;
      C3++;
      b = !b;
   }
/*
   C1 = 0;
   C2 = 1;
   C3 = 3;
   for(; x < tris.length; x+=3)
   {
      tris[x] = C1;
      tris[x+1] = C2;
      tris[x+2] = C3;
      C2+=1;
      C3+=1;
   }
*/
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
