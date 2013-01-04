using System.Collections.Generic;
using UnityEngine;

public class DynamicDecalExpeditor : DecalExpeditor
{   
    private int _currentBasis = 0;

    /// Send new created decal
    public override void PushNewDecalMesh(Mesh newDecalMesh)
    {

        _timeSinceLastAdd = Time.time;

        newDecalMesh.name = _decalType.name + " Decal Mesh";

        _allDecalMeshes.Add(newDecalMesh);

        // Craete free decal
        _freeDecals.Add(MakeDecalObject(newDecalMesh));

        ++_N;

        // Combine
        if (_N == _decalType.i_combineEvery)
        {
            CombineFreeDecals();
            _N = 0;
        }
    }
    /// Delete
    public override void DeleteCombinnedMesh()
    {
        Destroy(this.GetComponent<MeshFilter>().sharedMesh);
    }

    /// Create free gameobject
    private GameObject MakeDecalObject(Mesh decalMesh)
    {
        GameObject newFreeDecal = new GameObject("Free Decal");
        newFreeDecal.layer = DecalType.i_layer;
        newFreeDecal.transform.parent = transform;
        newFreeDecal.transform.localPosition = Vector3.zero;
        newFreeDecal.transform.localRotation = Quaternion.identity;
        newFreeDecal.transform.localScale = new Vector3(1, 1, 1);
        MeshFilter mFilter = newFreeDecal.AddComponent<MeshFilter>();
        MeshRenderer mRenderer = newFreeDecal.AddComponent<MeshRenderer>();
        mFilter.sharedMesh = decalMesh;
        mRenderer.material = renderer.sharedMaterial;
        mRenderer.castShadows = false;

        return newFreeDecal;
    }
    /// combine
    private void CombineFreeDecals()
    {

        ++_currentBasis;


        if (_currentBasis > _decalType.i_destroyGenerationDelay)
        {
            SendToDestroy();
        }

        foreach (GameObject freeDecal in _freeDecals)
        {
           // MeshFilter mFilter = freeDecal.GetComponent<MeshFilter>();

            Destroy(freeDecal);
        }

        _freeDecals.Clear();

        MeshFilter combinedMeshFilter = this.GetComponent<MeshFilter>();

        Destroy(combinedMeshFilter.sharedMesh);

        combinedMeshFilter.sharedMesh = DecalCreator.CreateCombinedMesh(_allDecalMeshes);

        combinedMeshFilter.sharedMesh.RecalculateBounds();
    }
    private void SendToDestroy()
    {
        // first N send to destroy
        for (int i = _decalType.i_combineEvery - 1; i >= 0; --i)
        {
            GameObject soonWillBeDestroyedDecal = MakeDecalObject(_allDecalMeshes[i]);
            soonWillBeDestroyedDecal.name = "SoonWillBeDestroyed";
            soonWillBeDestroyedDecal.layer = DecalType.i_layer;
            DecalDestroyer destroyer = soonWillBeDestroyedDecal.AddComponent("DecalDestroyer") as DecalDestroyer;
            destroyer.TimeToDestroy = 1 + i;
            destroyer.Fade = _decalType.i_fade;
            destroyer.FadingTime = _decalType.i_fadingTime;
            _allDecalMeshes.RemoveAt(i);
        }
    }    
}
