#pragma strict



static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      case 0: prefabName = "prefabs/towers/TowerLightningPrefab"; break;
      case 1: prefabName = "prefabs/towers/TowerMortarPrefab"; break;
      case 2: prefabName = "prefabs/towers/TowerSlowPrefab"; break;
      case 3: prefabName = "prefabs/towers/TowerPainterPrefab"; break;
   }
   return prefabName;
}

static function CreateAOEMesh(newAOE : float, scaleFactor : float, height : float) : Mesh
{
   var x : int; //Counter
   var stride : float = 10.0;

   //Create a new mesh
   var newAOEMesh : Mesh = new Mesh();

   //Vertices
   var vertex = new Vector3[(newAOE/stride+2)*2];

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

   //UVs
   var uvs = new Vector2[vertex.length];
   for(x = 0; x < vertex.length; x++)
   {
      uvs[x] =  ((x%2) == 0) ? Vector2(0,0) : Vector2(1,1);
   }

   //Triangles
   var tris = new int[(vertex.length*3)+(3*(newAOE/stride)*2)];

   var C1 : int = 0;
   var C2 : int = 1;
   var C3 : int = 2;
   var ind : int = 0;
   var stop : int = 2;

   if (newAOE >= 360) // A 360 AOE doesn't connect back to center
   {
      C1 = 2;
      C2 = 3;
      C3 = 4;
      stop = 4;
   }

   // -2 because we don't want try and make triangle out of the last 2 verts
   // OUTER EDGES
   var flipWinding : boolean = true;
   for(x=0; x<vertex.length-stop; x++)
   {
      flipWinding = !flipWinding;
      if (flipWinding)
      {
         tris[ind++] = C1;
         tris[ind++] = C2;
         tris[ind++] = C3;
      }
      else
      {
         tris[ind++] = C3;
         tris[ind++] = C2;
         tris[ind++] = C1;
      }
      C1++;
      C2++;
      C3++;
   }

   // Connect arc back to start position (NOTE: May be wound incorrectly)
   if (newAOE < 360) // A 360 AOE doesn't connect back to center
   {
      tris[ind++] = C2;
      tris[ind++] = C1;
      tris[ind++] = 0;
      tris[ind++] = 0;
      tris[ind++] = 1;
      tris[ind++] = C2;
   }

   // TOP
   C1 = 1;
   C2 = 3;
   C3 = 5;
   for(x=0; x<(newAOE/stride); x++)
   {
      tris[ind++] = C1;
      tris[ind++] = C2;
      tris[ind++] = C3;
      C2 += 2;
      C3 += 2;
   }

   // BOTTOM
   C1 = 0;
   C2 = 2;
   C3 = 4;
   for(x=0; x<(newAOE/stride); x++)
   {
      tris[ind++] = C3;
      tris[ind++] = C2;
      tris[ind++] = C1;
      C2 += 2;
      C3 += 2;
   }

   //Debug.Log("vl="+vertex.length+" ind="+ind+" sd="+(newAOE/stride)+" tl="+tris.length+" ne="+newAOE);

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
