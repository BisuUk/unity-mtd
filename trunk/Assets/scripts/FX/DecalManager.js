//
// Author:
//   Andreas Suter (andy@edelweissinteractive.com)
//
// Copyright (C) 2012 Edelweiss Interactive (http://edelweissinteractive.com)
//
#pragma strict

import System.Collections.Generic;
import Edelweiss.DecalSystem;

public class DecalManager extends MonoBehaviour
{
// The prefab which contains the DS_Decals script with already set material and
// uv rectangles.
var decalsPrefab : GameObject;

// The raycast hits a collider at a certain position. This value indicated how far we need to
// go back from that hit point along the ray of the raycast to place the new decal projector. Set
// this value to 0.0f to see why this is needed.
var decalProjectorOffset : float = 0.5;

// The size of new decal projectors.
var decalProjectorScale : Vector3 = Vector3 (0.2, 2.0, 0.2);
var cullingAngle : float = 90.0;

// Decal offset from target mesh
var meshOffset : float = 0.002;

// The references to the instantiated prefab's DS_Decals instances.
private var m_DecalsList : List.<DS_Decals> = List.<DS_Decals> ();

// Count decals, used for setting renderqueue so decals appear in correct z-order and DO NOT z-fight.
private var decalCount : int = 0;

function RemoveDecal(decal : DS_Decals, fadeOut : boolean)
{
   if (fadeOut)
   {
      m_DecalsList.Remove(decal);
      StartCoroutine(FadeOut(decal));
   }
   else
   {
      m_DecalsList.Remove(decal);
      Destroy(decal);
   }
}

function GetNearestDecal(pos : Vector3) : DS_Decals
{
   var closestRange : float = 999999.9;
   var closest : DS_Decals = null;
   for (var d : DS_Decals in m_DecalsList)
   {
      var r : float = (d.transform.position - pos).magnitude;
      if (r <= closestRange)
      {
         closestRange = r;
         closest = d;
      }
   }
   return closest;
}

function RemoveDecalNear(pos : Vector3, range : float, fadeOut : boolean)
{
   var closest : DS_Decals = GetNearestDecal(pos);

   if (closest && (closest.transform.position - pos).magnitude <= range)
   {
      if (fadeOut)
      {
         StartCoroutine(FadeOut(closest));
         m_DecalsList.Remove(closest);
      }
      else
      {
         m_DecalsList.Remove(closest);
         Destroy(closest.gameObject);
      }
   }
}

function SetColor(decal : DS_Decals, color : Color, fade : boolean)
{
   if (fade)
      FadeColor(decal, color);
   else
      decal.CurrentMaterial.color = color;
}

private function FadeColor(decal : DS_Decals, color : Color)
{
   var fadeStart : float = Time.time;
   var fadeEnd : float = Time.time+0.3; // fade time
   var colorStart : Color = decal.CurrentMaterial.color;
   while (Time.time <= fadeEnd)
   {
      var timeLerp : float = Mathf.InverseLerp(fadeStart, fadeEnd, Time.time);
      decal.CurrentMaterial.color = Color.Lerp(colorStart, color, timeLerp);
      yield;
   }
}

private function FadeOut(decal : DS_Decals)
{
   var fadeStart : float = Time.time;
   var fadeEnd : float = Time.time+0.3; // fade time
   var colorStart : Color = decal.CurrentMaterial.color;
   while (Time.time <= fadeEnd)
   {
      decal.CurrentMaterial.color.a = 1-Mathf.InverseLerp(fadeStart, fadeEnd, Time.time);
      yield;
   }

   Destroy(decal.gameObject);
}

// DPK NOTE: Typically you should create a single DS_Decals instance, and then spawn projectors
// that then create decals meshes, and they then get combined into a single mesh.
// However, we don't do this because we want each decal to have its own mesh and material,
// so we can control the color and alpha blending, for coloring/fade out effects.
// (It says you could do the above effects with vertex lighting, but meh, I used the shader).
//function SpawnDecal(l_Ray : Ray, l_RaycastHit : RaycastHit, uvRectangleIndex : int, color : Color) : DS_Decals
function SpawnDecal(l_RaycastHit : RaycastHit, uvRectangleIndex : int, color : Color) : DS_Decals
{
   // Instantiate the prefab and get its decals instance.
   var l_Instance = UnityEngine.Object.Instantiate(decalsPrefab, l_RaycastHit.point, Quaternion.identity);
   var l_Decals : DS_Decals = l_Instance.GetComponentInChildren.<DS_Decals> ();
   var l_WorldToDecalsMatrix : Matrix4x4;

   // Intermediate mesh data. Mesh data is added to that one for a specific projector
   // in order to perform the cutting.
   var l_DecalsMesh : DecalsMesh;
   var l_DecalsMeshCutter : DecalsMeshCutter;

   if (l_Decals == null)
   {
      Debug.LogError ("The 'decalsPrefab' does not contain a 'DS_Decals' instance!");
      return null;
   }
   else
   {
      // Create the decals mesh (intermediate mesh data) for our decals instance.
      // Further we need a decals mesh cutter instance and the world to decals matrix.
      l_DecalsMesh = new DecalsMesh (l_Decals);
      l_DecalsMeshCutter = new DecalsMeshCutter ();
      l_WorldToDecalsMatrix = l_Decals.CachedTransform.worldToLocalMatrix;
   }

   // Create a copy of the decal material, so we don't effect ALL decals of this type
   decalCount += 1;
   var mat : Material = new Material(l_Decals.CurrentMaterial);
   l_Decals.CurrentMaterial = mat;
   mat.color = color;
   mat.renderQueue = 2000 + decalCount; // forcing renderqueue here, avoids z-fighting
   m_DecalsList.Add(l_Decals);

   // Get rectangle index for the texture to display, set in the editor.
   var l_UVRectangleIndex : int = uvRectangleIndex;
   if (l_UVRectangleIndex >= l_Decals.uvRectangles.Length)
      l_UVRectangleIndex = 0;

   // Calculate the position and rotation for the new decal projector
   // FROM CAMERA VIEW
   //var l_ProjectorPosition = l_RaycastHit.point - (decalProjectorOffset * l_Ray.direction.normalized);
   //var l_ForwardDirection = Camera.main.transform.up;
   //var l_UpDirection = - Camera.main.transform.forward;
   //var l_ProjectorRotation : Quaternion = Quaternion.LookRotation (l_ForwardDirection, l_UpDirection);

   // Calculate the position and rotation for the new decal projector.
   // FROM HIT SURFACE NORMAL
   var l_ProjectorPosition : Vector3 = l_RaycastHit.point + (decalProjectorOffset * l_RaycastHit.normal.normalized);
   var l_UpDirection : Vector3 = l_RaycastHit.normal.normalized;
   var l_ForwardDirection : Vector3 = Vector3.right;
   if (l_UpDirection != Vector3.up)
   {
      var rightVector : Vector3 = Vector3.Cross(-l_RaycastHit.normal.normalized, Vector3.up);
      l_ForwardDirection = Quaternion.AngleAxis(90, rightVector) * l_UpDirection;
   }
   var l_ProjectorRotation : Quaternion = Quaternion.LookRotation(l_ForwardDirection, l_UpDirection);


   // Randomize the rotation.
   var l_RandomRotation = Quaternion.Euler (0.0f, Random.Range (0.0f, 360.0f), 0.0f);
   l_ProjectorRotation = l_ProjectorRotation * l_RandomRotation;
   
   var l_TerrainCollider : TerrainCollider = l_RaycastHit.collider as TerrainCollider;
   if (l_TerrainCollider != null)
   {
      // Terrain collider hit.
      var l_Terrain : Terrain = l_TerrainCollider.GetComponent.<Terrain> ();
      if (l_Terrain != null)
      {
         // Create the decal projector with all the required information.
         var l_TerrainDecalProjector = DecalProjector (l_ProjectorPosition, l_ProjectorRotation, decalProjectorScale, cullingAngle, meshOffset, l_UVRectangleIndex, l_UVRectangleIndex);
         
         // Add the projector to our list and the decals mesh, such that both are
         // synchronized. All the mesh data that is now added to the decals mesh
         // will belong to this projector.
         //m_DecalProjectors.Add (l_TerrainDecalProjector);
         l_DecalsMesh.AddProjector (l_TerrainDecalProjector);
         
         // The terrain data has to be converted to the decals instance's space.
         var l_TerrainToDecalsMatrix = Matrix4x4.TRS (l_Terrain.transform.position, Quaternion.identity, Vector3.one) * l_WorldToDecalsMatrix;
         
         // Pass the terrain data with the corresponding conversion to the decals mesh.
         l_DecalsMesh.Add (l_Terrain, l_TerrainToDecalsMatrix);
         
         // Cut the data in the decals mesh accoring to the size and position of the decal projector. Offset the
         // vertices afterwards and pass the newly computed mesh to the decals instance, such that it becomes
         // visible.
         l_DecalsMeshCutter.CutDecalsPlanes (l_DecalsMesh);
         l_DecalsMesh.OffsetActiveProjectorVertices ();
         l_Decals.UpdateDecalsMeshes (l_DecalsMesh);
      }
      else
      {
         Debug.Log ("Terrain is null!");
      }
   }
   else
   {
      // We hit a collider. Next we have to find the mesh that belongs to the collider.
      // That step depends on how you set up your mesh filters and collider relative to
      // each other in the game objects. It is important to have a consistent way in order
      // to have a simpler implementation.
      var l_MeshCollider = l_RaycastHit.collider.GetComponent.<MeshCollider> ();
      var l_MeshFilter = l_RaycastHit.collider.GetComponent.<MeshFilter> ();
      
      if (l_MeshCollider != null || l_MeshFilter != null)
      {
         var l_Mesh : Mesh = null;
         if (l_MeshCollider != null)
         {
            // Mesh collider was hit. Just use the mesh data from that one.
            l_Mesh = l_MeshCollider.sharedMesh;
         }
         else if (l_MeshFilter != null)
         {
            // Otherwise take the data from the shared mesh.
            l_Mesh = l_MeshFilter.sharedMesh;
         }
   
         if (l_Mesh != null)
         {
            // Create the decal projector.
            var l_DecalProjector = DecalProjector (l_ProjectorPosition, l_ProjectorRotation, decalProjectorScale, cullingAngle, meshOffset, l_UVRectangleIndex, l_UVRectangleIndex);
      
            // Add the projector to our list and the decals mesh, such that both are
            // synchronized. All the mesh data that is now added to the decals mesh
            // will belong to this projector.
            //l_DecalProjectors.Add (l_DecalProjector);
            l_DecalsMesh.AddProjector (l_DecalProjector);
      
            // Get the required matrices.
            var l_WorldToMeshMatrix = l_RaycastHit.collider.renderer.transform.worldToLocalMatrix;
            var l_MeshToWorldMatrix = l_RaycastHit.collider.renderer.transform.localToWorldMatrix;
      
            // Add the mesh data to the decals mesh, cut and offset it before we pass it
            // to the decals instance to be displayed.
            l_DecalsMesh.Add (l_Mesh, l_WorldToMeshMatrix, l_MeshToWorldMatrix);
            l_DecalsMeshCutter.CutDecalsPlanes (l_DecalsMesh);
            l_DecalsMesh.OffsetActiveProjectorVertices ();
            l_Decals.UpdateDecalsMeshes (l_DecalsMesh);
            // Parent decal to hit collider transform, so decal will stay on moving platforms, etc.
            l_Decals.CachedTransform.parent = l_RaycastHit.collider.transform;
         }
      }
   }

   return l_Decals;
}


}
